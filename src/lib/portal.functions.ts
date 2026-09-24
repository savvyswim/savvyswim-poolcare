import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Rpc = { rpc: (fn: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }> };

/** Customer record ids linked to the signed-in login, decided by the database. */
async function myCustomerIds(supabase: unknown): Promise<string[]> {
  const { data } = await (supabase as Rpc).rpc("ss_my_customer_ids");
  const list = Array.isArray(data) ? data : data ? [data] : [];
  return list
    .map((v) => (typeof v === "string" ? v : (v as Record<string, string>)?.["ss_my_customer_ids"]))
    .filter(Boolean) as string[];
}

async function assertOffice(supabase: unknown) {
  const { data } = await (supabase as Rpc).rpc("ss_is_office");
  if (data !== true) throw new Error("Office access required");
}

export const getMyPortal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const ids = await myCustomerIds(context.supabase);
    if (ids.length === 0) return { linked: false as const };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [cust, reqs, visits, tickets] = await Promise.all([
      supabaseAdmin.from("ss_customers").select("id, full_name, address, city, phone, email").in("id", ids),
      supabaseAdmin
        .from("inspection_requests")
        .select("id, reference_number, status, preferred_date, preferred_contact_time, created_at, lead_type")
        .in("converted_customer_id", ids)
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("ss_visits")
        .select("id, scheduled_date, status, notes, completed_at")
        .in("customer_id", ids)
        .order("scheduled_date", { ascending: false })
        .limit(50),
      supabaseAdmin.from("ss_tickets").select("id").in("customer_id", ids),
    ]);
    const reqIds = (reqs.data ?? []).map((r) => r.id);
    const { data: events } = reqIds.length
      ? await supabaseAdmin
          .from("inspection_events")
          .select("request_id, event_type, created_at, detail")
          .in("request_id", reqIds)
          .in("event_type", ["email_sent", "sms_sent", "booking_confirmation_sent", "visit_scheduled"])
          .order("created_at", { ascending: false })
      : { data: [] };
    const tIds = (tickets.data ?? []).map((t) => t.id);
    const { data: messages } = tIds.length
      ? await supabaseAdmin
          .from("ss_ticket_messages")
          .select("id, body, author_kind, author_label, created_at")
          .in("ticket_id", tIds)
          .order("created_at", { ascending: true })
      : { data: [] };
    return {
      linked: true as const,
      customer: cust.data?.[0] ?? null,
      requests: reqs.data ?? [],
      confirmations: events ?? [],
      visits: visits.data ?? [],
      messages: messages ?? [],
    };
  });

/** One open conversation per customer, reused for every message. */
async function ticketFor(customerId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: t } = await supabaseAdmin
    .from("ss_tickets")
    .select("id")
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (t) return t.id as string;
  const { data: created, error } = await supabaseAdmin
    .from("ss_tickets")
    .insert({ customer_id: customerId, subject: "Portal messages", category: "general" } as never)
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return created.id as string;
}

export const sendPortalMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ body: z.string().trim().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const ids = await myCustomerIds(context.supabase);
    if (!ids[0]) throw new Error("Your login is not linked to a customer yet");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ticketId = await ticketFor(ids[0]);
    const now = new Date().toISOString();
    const { error } = await supabaseAdmin.from("ss_ticket_messages").insert({
      ticket_id: ticketId,
      body: data.body,
      author_kind: "customer",
      author_user_id: context.userId,
      author_label: "Customer",
    } as never);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("ss_tickets").update({ last_message_at: now, status: "open" } as never).eq("id", ticketId);
    return { ok: true };
  });

export const requestPortalReschedule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), note: z.string().max(500).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const ids = await myCustomerIds(context.supabase);
    if (!ids[0]) throw new Error("Your login is not linked to a customer yet");
    const { error } = await (context.supabase as unknown as Rpc).rpc("ss_request_visit_reschedule", {
      p_customer_id: ids[0],
      p_date: data.date,
      p_note: data.note ?? "",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Office side: the conversation for one customer. */
export const getCustomerMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ customerId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertOffice(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: tickets }, { data: cust }] = await Promise.all([
      supabaseAdmin.from("ss_tickets").select("id").eq("customer_id", data.customerId),
      supabaseAdmin.from("ss_customers").select("user_id").eq("id", data.customerId).maybeSingle(),
    ]);
    const ids = (tickets ?? []).map((t) => t.id);
    const { data: messages } = ids.length
      ? await supabaseAdmin
          .from("ss_ticket_messages")
          .select("id, body, author_kind, author_label, created_at")
          .in("ticket_id", ids)
          .order("created_at", { ascending: true })
      : { data: [] };
    return { messages: messages ?? [], hasLogin: !!(cust as { user_id?: string } | null)?.user_id };
  });

export const replyCustomerMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ customerId: z.string().uuid(), body: z.string().trim().min(1).max(2000) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertOffice(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const ticketId = await ticketFor(data.customerId);
    const { error } = await supabaseAdmin.from("ss_ticket_messages").insert({
      ticket_id: ticketId,
      body: data.body,
      author_kind: "staff",
      author_user_id: context.userId,
      author_label: "Savvy Swim office",
    } as never);
    if (error) throw new Error(error.message);
    await supabaseAdmin
      .from("ss_tickets")
      .update({ last_message_at: new Date().toISOString() } as never)
      .eq("id", ticketId);
    return { ok: true };
  });
