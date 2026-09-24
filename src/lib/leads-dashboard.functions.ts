import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { derivePipeline, CRM_STAGE, type PipelineStage } from "./pipeline-stage";

/**
 * Free inspection leads dashboard. Every inspection request with counts,
 * source, discount code and status. Office/owner only.
 */

export type LeadsRange = "7d" | "30d" | "90d" | "all";

export interface LeadRow {
  id: string;
  created_at: string;
  reference_number: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  source: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  page_path: string | null;
  lead_type: string | null;
  status: string | null;
  promo_code: string | null;
  promo_status: string | null;
  promo_detail: string | null;
  pipeline: PipelineStage;
  pipeline_manual: boolean;
}

export interface LeadsReport {
  range: LeadsRange;
  total: number;
  today: number;
  week: number;
  month: number;
  withCode: number;
  fromGoogle: number;
  bySource: { key: string; count: number }[];
  daily: { day: string; count: number }[];
  leads: LeadRow[];
}

const InputSchema = z.object({
  range: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
  source: z.string().trim().max(120).optional(),
});

function startOf(range: LeadsRange): string | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** City is stored inside the free-text address on website leads. */
function cityFromAddress(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return parts[parts.length - 2]?.replace(/\s+TX.*$/i, "").trim() || null;
}

export const getLeadsReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<LeadsReport> => {
    const { data: isOffice } = await (
      context.supabase as unknown as {
        rpc: (fn: "ss_is_office") => Promise<{ data: unknown }>;
      }
    ).rpc("ss_is_office");
    if (isOffice !== true) throw new Error("Office access required");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("inspection_requests")
      .select(
        "id, created_at, converted_customer_id, reference_number, full_name, email, phone, address, source, utm_source, utm_campaign, page_path, lead_type, status, promo_code, promo_status, promo_detail",
      )
      .order("created_at", { ascending: false })
      .limit(1000);

    const since = startOf(data.range);
    if (since) query = query.gte("created_at", since);
    if (data.source) query = query.eq("source", data.source);

    const { data: rows, error } = await query;
    if (error) {
      console.error("leads report failed", error.message);
      throw new Error("Could not load leads");
    }

    const ids = (rows ?? []).map((r) => r.id as string);
    const evMap = new Map<string, { event_type: string; status_to: string | null; created_at: string }[]>();
    for (let i = 0; i < ids.length; i += 200) {
      const { data: evs } = await supabaseAdmin
        .from("inspection_events")
        .select("request_id, event_type, status_to, created_at")
        .in("request_id", ids.slice(i, i + 200));
      for (const e of evs ?? []) {
        const list = evMap.get(e.request_id) ?? [];
        list.push(e);
        evMap.set(e.request_id, list);
      }
    }

    const leads: LeadRow[] = (rows ?? []).map((r) => ({
      ...(() => {
        const p = derivePipeline({
          status: (r.status as string) ?? null,
          convertedCustomerId: ((r as Record<string, unknown>)["converted_customer_id"] as string) ?? null,
          events: evMap.get(r.id as string) ?? [],
        });
        return { pipeline: p.stage, pipeline_manual: p.manual };
      })(),
      id: r.id as string,
      created_at: r.created_at as string,
      reference_number: (r.reference_number as string) ?? null,
      full_name: (r.full_name as string) ?? null,
      email: (r.email as string) ?? null,
      phone: (r.phone as string) ?? null,
      address: (r.address as string) ?? null,
      city: cityFromAddress((r.address as string) ?? null),
      source: (r.source as string) ?? null,
      utm_source: (r.utm_source as string) ?? null,
      utm_campaign: (r.utm_campaign as string) ?? null,
      page_path: (r.page_path as string) ?? null,
      lead_type: (r.lead_type as string) ?? null,
      status: (r.status as string) ?? null,
      promo_code: ((r as Record<string, unknown>)["promo_code"] as string) ?? null,
      promo_status: ((r as Record<string, unknown>)["promo_status"] as string) ?? null,
      promo_detail: ((r as Record<string, unknown>)["promo_detail"] as string) ?? null,
    }));

    const now = Date.now();
    const within = (ms: number) =>
      leads.filter((l) => now - new Date(l.created_at).getTime() <= ms).length;

    const sourceMap = new Map<string, number>();
    for (const l of leads) {
      const key = l.source || l.utm_source || "direct";
      sourceMap.set(key, (sourceMap.get(key) ?? 0) + 1);
    }

    const dayMap = new Map<string, number>();
    for (const l of leads) {
      const day = l.created_at.slice(0, 10);
      dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
    }

    return {
      range: data.range,
      total: leads.length,
      today: within(86_400_000),
      week: within(7 * 86_400_000),
      month: within(30 * 86_400_000),
      withCode: leads.filter((l) => !!l.promo_code).length,
      fromGoogle: leads.filter((l) =>
        /google|gbp/i.test(`${l.source ?? ""} ${l.utm_source ?? ""}`),
      ).length,
      bySource: [...sourceMap.entries()]
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count),
      daily: [...dayMap.entries()]
        .map(([day, count]) => ({ day, count }))
        .sort((a, b) => (a.day < b.day ? -1 : 1)),
      leads,
    };
  });

/** Office moves a lead to a pipeline stage by hand; mirrored onto the CRM lead. */
export const setLeadPipelineStage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        stage: z.enum(["enquiry", "quote", "booking", "won", "lost"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: isOffice } = await (
      context.supabase as unknown as { rpc: (fn: "ss_is_office") => Promise<{ data: unknown }> }
    ).rpc("ss_is_office");
    if (isOffice !== true) throw new Error("Office access required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("inspection_events").insert({
      request_id: data.id,
      event_type: "pipeline_stage_set",
      status_to: data.stage,
      detail: "Set by the office",
    });
    if (error) throw new Error(error.message);
    const { syncRequestToCrmLead } = await import("./crm-local-lead.server");
    await syncRequestToCrmLead(data.id, { stage: CRM_STAGE[data.stage] });
    return { ok: true };
  });
