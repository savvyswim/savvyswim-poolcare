import type { LeadSyncRow } from "./lead-sync.functions";

/** Recent website leads joined with their CRM delivery log entry. */
export async function loadLeadSyncRows(): Promise<LeadSyncRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 30 * 864e5).toISOString();

  const { data: leads, error } = await supabaseAdmin
    .from("inspection_requests")
    .select("id, created_at, full_name, email, phone, city, source, lead_type, crm_synced_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);

  const rows = leads ?? [];
  const ids = rows.map((r) => r.id);

  const deliveries = ids.length
    ? (
        await supabaseAdmin
          .from("ss_webhook_deliveries")
          .select("event_key, outcome, attempts, http_status, last_error, last_attempt_at")
          .eq("channel", "lead")
          .in("event_key", ids)
      ).data ?? []
    : [];

  const byLead = new Map<string, (typeof deliveries)[number]>();
  for (const d of deliveries) {
    if (!d.event_key) continue;
    const prev = byLead.get(d.event_key);
    if (!prev || (d.last_attempt_at ?? "") > (prev.last_attempt_at ?? "")) {
      byLead.set(d.event_key, d);
    }
  }

  return rows.map((r) => {
    const d = byLead.get(r.id);
    const status: LeadSyncRow["status"] = r.crm_synced_at
      ? "synced"
      : d && d.outcome === "failed"
        ? "failed"
        : "pending";
    return {
      id: r.id,
      created_at: r.created_at,
      full_name: r.full_name ?? null,
      email: r.email ?? null,
      phone: r.phone ?? null,
      city: r.city ?? null,
      source: r.source ?? null,
      lead_type: r.lead_type ?? null,
      crm_synced_at: r.crm_synced_at ?? null,
      status,
      last_attempt_at: d?.last_attempt_at ?? null,
      attempts: d?.attempts ?? 0,
      http_status: d?.http_status ?? null,
      last_error: d?.last_error ?? null,
    };
  });
}
