/**
 * Unified webhook delivery log.
 *
 * Every lead handoff to the CRM, every inbound appointment-status push and
 * every inbound payment push writes one row here so the admin dashboard can
 * show delivery health, failures and retry history in one place.
 *
 * Server-only: never import from a client-reachable module.
 */

export type WebhookChannel = "lead" | "appointment" | "payment";
export type WebhookOutcome = "success" | "failed" | "skipped";

export type WebhookDeliveryEntry = {
  channel: WebhookChannel;
  direction?: "inbound" | "outbound";
  /** Stable key per event — a repeat with the same key counts as a retry. */
  eventKey?: string | null;
  endpoint?: string | null;
  /** Human-readable subject: customer name, appointment id, invoice number. */
  reference?: string | null;
  outcome: WebhookOutcome;
  httpStatus?: number | null;
  error?: string | null;
  request?: unknown;
  response?: string | null;
  isRetry?: boolean;
  retriedBy?: string | null;
};

/** Records (or updates) a delivery attempt. Never throws — logging is best effort. */
export async function logWebhookDelivery(entry: WebhookDeliveryEntry): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const now = new Date().toISOString();
    const base = {
      channel: entry.channel,
      direction: entry.direction ?? "outbound",
      endpoint: entry.endpoint ?? null,
      reference: entry.reference ?? null,
      outcome: entry.outcome,
      http_status: entry.httpStatus ?? null,
      last_error: entry.error ? entry.error.slice(0, 1000) : null,
      request: (entry.request ?? {}) as never,
      response: entry.response ? entry.response.slice(0, 2000) : null,
      last_attempt_at: now,
    };

    if (entry.eventKey) {
      const { data: existing } = await supabaseAdmin
        .from("ss_webhook_deliveries")
        .select("id, attempts")
        .eq("channel", entry.channel)
        .eq("event_key", entry.eventKey)
        .maybeSingle();

      if (existing) {
        await supabaseAdmin
          .from("ss_webhook_deliveries")
          .update({
            ...base,
            attempts: (existing.attempts ?? 1) + 1,
            ...(entry.isRetry
              ? { retried_at: now, retried_by: entry.retriedBy ?? null }
              : {}),
          })
          .eq("id", existing.id);
        return;
      }
    }

    await supabaseAdmin.from("ss_webhook_deliveries").insert({
      ...base,
      event_key: entry.eventKey ?? null,
      attempts: 1,
      ...(entry.isRetry ? { retried_at: now, retried_by: entry.retriedBy ?? null } : {}),
    });
  } catch (err) {
    console.error("[webhook-log] failed to record delivery", err instanceof Error ? err.message : err);
  }
}
