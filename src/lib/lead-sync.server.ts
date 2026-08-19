import type { LeadSyncRow } from "./lead-sync.functions";

/** Recent website leads joined with their CRM delivery log entry. */
export async function loadLeadSyncRows(): Promise<LeadSyncRow[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - 30 * 864e5).toISOString();

  const { data: leads, error } = await supabaseAdmin
    .from("inspection_requests")
    .select("id, created_at, full_name, email, phone, address, postal_code, contact_consent, consent_text, source, lead_type, crm_synced_at, crm_lead_id, status")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error(error.message);

  const { cityFromAddress } = await import("./postal");
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
    const leadStatus = (r.status ?? "new") as LeadSyncRow["lead_status"];
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
      city: cityFromAddress(r.address) || null,
      postal_code: r.postal_code || null,
      contact_consent: r.contact_consent === true,
      consent_text: r.consent_text ?? null,
      source: r.source ?? null,
      lead_type: r.lead_type ?? null,
      crm_synced_at: r.crm_synced_at ?? null,
      crm_lead_id: r.crm_lead_id ?? null,
      lead_status: leadStatus,
      status,
      last_attempt_at: d?.last_attempt_at ?? null,
      attempts: d?.attempts ?? 0,
      http_status: d?.http_status ?? null,
      last_error: d?.last_error ?? null,
    };
  });
}

export type BulkRetryResult = {
  attempted: number;
  recovered: number;
  stillFailing: number;
  ranAt: string;
};

/**
 * Re-send every lead whose CRM handoff failed. Bounded per run so a bad CRM
 * endpoint can never turn this into a retry storm.
 */
export async function retryFailedLeadSyncs(limit = 10): Promise<BulkRetryResult> {
  const rows = await loadLeadSyncRows();
  const failed = rows.filter((r) => r.status === "failed").slice(0, limit);
  if (failed.length === 0) {
    return { attempted: 0, recovered: 0, stillFailing: 0, ranAt: new Date().toISOString() };
  }
  const { forwardInspectionToCrm } = await import("./crm-lead-forward.server");
  let recovered = 0;
  for (const lead of failed) {
    try {
      const res = await forwardInspectionToCrm(lead.id);
      if (res.forwarded) recovered += 1;
    } catch {
      // delivery log already records the failure; keep processing the batch
    }
  }
  return {
    attempted: failed.length,
    recovered,
    stillFailing: failed.length - recovered,
    ranAt: new Date().toISOString(),
  };
}
