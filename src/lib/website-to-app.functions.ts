import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * "Website to app" delivery report.
 *
 * One list of everything the website captured (leads, bookings, reviews, call
 * and text taps) with whether the SavvySwim app accepted it, plus a resend
 * button. Office and owner only, checked server-side.
 */
export type WebsiteToAppKind = "lead" | "review" | "contact";

/** sent = accepted, bounced = refused but still retrying, abandoned = gave up (8 tries or lead gone). */
export type DeliveryStatus = "sent" | "bounced" | "abandoned";

export type WebsiteToAppRow = {
  id: string;
  kind: WebsiteToAppKind;
  reference: string;
  created_at: string;
  last_attempt_at: string | null;
  attempts: number;
  outcome: "success" | "failed" | "skipped";
  status: DeliveryStatus;
  http_status: number | null;
  last_error: string | null;
  event_key: string | null;
};

export type WebsiteToAppReport = {
  rows: WebsiteToAppRow[];
  totals: { delivered: number; failed: number; bounced: number; abandoned: number; total: number };
};

async function assertOffice(supabase: {
  rpc: (fn: "ss_is_office") => Promise<{ data: unknown; error: unknown }>;
}) {
  const { data } = await supabase.rpc("ss_is_office");
  if (data !== true) throw new Error("Office access required");
}

export const getWebsiteToAppReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<WebsiteToAppReport> => {
    await assertOffice(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data } = await supabaseAdmin
      .from("ss_webhook_deliveries")
      .select(
        "id, channel, event_key, reference, outcome, http_status, last_error, attempts, last_attempt_at, created_at",
      )
      .eq("direction", "outbound")
      .in("channel", ["lead", "review", "contact"])
      .order("created_at", { ascending: false })
      .limit(300);

    const rows: WebsiteToAppRow[] = (data ?? []).map((r) => {
      const outcome = (r.outcome ?? "failed") as WebsiteToAppRow["outcome"];
      const attempts = r.attempts ?? 1;
      const status: DeliveryStatus =
        outcome === "success" ? "sent" : outcome === "skipped" || attempts >= 8 ? "abandoned" : "bounced";
      return {
        id: r.id,
        kind: (r.channel === "review" ? "review" : r.channel === "contact" ? "contact" : "lead") as WebsiteToAppKind,
        reference: r.reference ?? r.event_key ?? "website item",
        created_at: r.created_at ?? new Date().toISOString(),
        last_attempt_at: r.last_attempt_at,
        attempts,
        outcome,
        status,
        http_status: r.http_status,
        last_error: r.last_error,
        event_key: r.event_key,
      };
    });

    const delivered = rows.filter((r) => r.status === "sent").length;
    const bounced = rows.filter((r) => r.status === "bounced").length;
    const abandoned = rows.filter((r) => r.status === "abandoned").length;
    return { rows, totals: { delivered, failed: bounced + abandoned, bounced, abandoned, total: rows.length } };
  });

export const resendWebsiteItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<{ ok: boolean; status: number }> => {
    await assertOffice(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("ss_webhook_deliveries")
      .select("channel, event_key, reference, request")
      .eq("id", data.id)
      .maybeSingle();
    if (!row?.event_key) return { ok: false, status: 0 };

    if (row.channel === "lead") {
      const { retryInspectionToCrm } = await import("./crm-lead-forward.server");
      const res = await retryInspectionToCrm(row.event_key);
      return { ok: res.forwarded, status: res.status };
    }

    const payload = (row.request ?? {}) as Record<string, unknown>;
    if (Object.keys(payload).length === 0) return { ok: false, status: 0 };
    const { postSiteActivity } = await import("./site-activity-forward.server");
    const res = await postSiteActivity({
      channel: row.channel === "review" ? "review" : "contact",
      eventKey: row.event_key,
      reference: row.reference ?? row.event_key,
      payload,
      isRetry: true,
    });
    return { ok: res.forwarded, status: res.status };
  });

/** Website requests (last 90 days) that are missing from the CRM lead list. */
export const getSameOnBoth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOffice(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - 90 * 864e5).toISOString();
    const [{ data: reqs }, { data: leads }] = await Promise.all([
      supabaseAdmin
        .from("inspection_requests")
        .select("id, reference_number, full_name, created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500),
      supabaseAdmin.from("ss_leads").select("message").gte("created_at", since).limit(2000),
    ]);
    const text = (leads ?? []).map((l) => l.message ?? "").join("\n");
    const missing = (reqs ?? [])
      .filter((r) => !text.includes(`[ref ${r.reference_number ?? r.id}]`))
      .map((r) => ({ id: r.id, reference: r.reference_number ?? r.id, name: r.full_name, created_at: r.created_at }));
    return { total: reqs?.length ?? 0, missing };
  });

/** Copies every missing website request into the CRM lead list. */
export const fixSameOnBoth = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ ids: z.array(z.string().uuid()).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOffice(context.supabase as never);
    // Saves each request in the CRM lead list and re-sends it to savvyswim.app
    // (the app dedupes by reference, so nothing doubles).
    const { forwardInspectionToCrm } = await import("./crm-lead-forward.server");
    let fixed = 0;
    let sentToApp = 0;
    const failed: { id: string; status: number }[] = [];
    for (const id of data.ids) {
      try {
        const r = await forwardInspectionToCrm(id);
        fixed++;
        if (r.forwarded) sentToApp++;
        else failed.push({ id, status: r.status });
      } catch {
        failed.push({ id, status: 0 });
      }
    }
    return { fixed, sentToApp, failed };
  });

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "").slice(-10);

async function findMissingAppCustomers() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 90 * 864e5).toISOString();
  const [{ data: custs }, { data: reqs }] = await Promise.all([
    supabaseAdmin
      .from("ss_customers")
      .select("id, full_name, phone, email, address, city, state, postal_code, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
    supabaseAdmin.from("inspection_requests").select("phone, email, converted_customer_id").limit(5000),
  ]);
  const phones = new Set<string>();
  const emails = new Set<string>();
  const linked = new Set<string>();
  for (const r of reqs ?? []) {
    const p = digits(r.phone);
    if (p.length === 10) phones.add(p);
    if (r.email) emails.add(r.email.toLowerCase());
    if (r.converted_customer_id) linked.add(r.converted_customer_id);
  }
  const missing = (custs ?? []).filter((c) => {
    if (linked.has(c.id)) return false;
    const p = digits(c.phone);
    if (p.length === 10 && phones.has(p)) return false;
    if (c.email && emails.has(c.email.toLowerCase())) return false;
    return true;
  });
  return { total: custs?.length ?? 0, missing, supabaseAdmin };
}

/** App customers (last 90 days) missing from the website lead list. */
export const getAppCustomersMissing = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOffice(context.supabase as never);
    const { total, missing } = await findMissingAppCustomers();
    return {
      total,
      missing: missing.map((c) => ({ id: c.id, name: c.full_name, created_at: c.created_at })),
    };
  });

/** Adds missing app customers to the website lead list (no emails, no CRM forward). */
export const pushAppCustomersToWebsite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ ids: z.array(z.string().uuid()).max(500) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOffice(context.supabase as never);
    const { missing, supabaseAdmin } = await findMissingAppCustomers();
    const wanted = new Set(data.ids);
    let added = 0;
    for (const c of missing.filter((m) => wanted.has(m.id))) {
      const { error } = await supabaseAdmin.from("inspection_requests").insert({
        full_name: c.full_name,
        phone: c.phone ?? "",
        email: c.email ?? `no-email.${c.id}@savvyswim.com`,
        address: [c.address, c.city].filter(Boolean).join(", "),

        postal_code: c.postal_code ?? "",
        source: "crm_app",
        status: "converted",
        converted_customer_id: c.id,
        converted_at: new Date().toISOString(),
        notes: "From the app",
      } as never);
      if (error) console.error("pushAppCustomersToWebsite", c.id, error.message);
      else added++;
    }
    return { added };
  });
