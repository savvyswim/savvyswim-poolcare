import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * CRM handoff state for a lead, read from the same delivery log the
 * /admin/lead-sync screen uses. RLS applies as the signed-in office user.
 */
export type LeadSyncState = {
  sync_status: "synced" | "failed" | "pending";
  crm_synced_at: string | null;
  attempts: number;
  http_status: number | null;
  last_error: string | null;
  last_attempt_at: string | null;
};

type Delivery = {
  event_key: string | null;
  outcome: string | null;
  attempts: number | null;
  http_status: number | null;
  last_error: string | null;
  last_attempt_at: string | null;
};

/** Latest CRM delivery row per lead id. */
export async function loadDeliveries(
  supabase: SupabaseClient,
  ids: string[],
): Promise<Map<string, Delivery>> {
  const map = new Map<string, Delivery>();
  if (!ids.length) return map;
  const { data } = await supabase
    .from("ss_webhook_deliveries")
    .select("event_key, outcome, attempts, http_status, last_error, last_attempt_at")
    .eq("channel", "lead")
    .in("event_key", ids);
  for (const d of (data ?? []) as Delivery[]) {
    if (!d.event_key) continue;
    const prev = map.get(d.event_key);
    if (!prev || (d.last_attempt_at ?? "") > (prev.last_attempt_at ?? "")) map.set(d.event_key, d);
  }
  return map;
}

export function syncState(crmSyncedAt: string | null, d?: Delivery): LeadSyncState {
  return {
    sync_status: crmSyncedAt ? "synced" : d?.outcome === "failed" ? "failed" : "pending",
    crm_synced_at: crmSyncedAt ?? null,
    attempts: d?.attempts ?? 0,
    http_status: d?.http_status ?? null,
    last_error: d?.last_error ?? null,
    last_attempt_at: d?.last_attempt_at ?? null,
  };
}
