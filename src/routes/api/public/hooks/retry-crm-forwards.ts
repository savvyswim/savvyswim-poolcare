/**
 * Automatic retry for anything that failed to reach the SavvySwim app.
 *
 * Runs on a schedule. Picks up failed handoffs from the delivery log
 * (ss_webhook_deliveries) plus any website lead that never got a successful
 * push, waits a growing gap between attempts, and gives up flagging the row
 * after MAX_ATTEMPTS so the office can look at it on the admin page.
 *
 * Guarded by the ops shared secret, no caller input is used.
 */
import { createFileRoute } from "@tanstack/react-router";

const MAX_ATTEMPTS = 8;
const BATCH = 25;

/** Minutes to wait before attempt n+1: 2, 8, 18, 32, 50, 72, 98. */
function backoffMinutes(attempts: number): number {
  return Math.min(180, 2 * attempts * attempts);
}

export const Route = createFileRoute("/api/public/hooks/retry-crm-forwards")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { guardOpsHook } = await import("@/lib/ops-hook-auth.server");
        const denied = guardOpsHook(request, "retry-crm-forwards");
        if (denied) return denied;

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const now = Date.now();
        let retried = 0;
        let recovered = 0;

        const { data: failed } = await supabaseAdmin
          .from("ss_webhook_deliveries")
          .select("id, channel, event_key, reference, attempts, last_attempt_at, request")
          .eq("direction", "outbound")
          .eq("outcome", "failed")
          .in("channel", ["lead", "review", "contact"])
          .lt("attempts", MAX_ATTEMPTS)
          .order("last_attempt_at", { ascending: true })
          .limit(BATCH);

        for (const row of failed ?? []) {
          if (!row.event_key) continue;
          const last = row.last_attempt_at ? Date.parse(row.last_attempt_at) : 0;
          const waitMs = backoffMinutes(row.attempts ?? 1) * 60_000;
          if (last && now - last < waitMs) continue;

          retried++;
          try {
            if (row.channel === "lead") {
              const { retryInspectionToCrm } = await import("@/lib/crm-lead-forward.server");
              const res = await retryInspectionToCrm(row.event_key);
              if (res.forwarded) recovered++;
            } else {
              const payload = (row.request ?? {}) as Record<string, unknown>;
              if (!payload || Object.keys(payload).length === 0) continue;
              const { postSiteActivity } = await import("@/lib/site-activity-forward.server");
              const res = await postSiteActivity({
                channel: row.channel === "review" ? "review" : "contact",
                eventKey: row.event_key,
                reference: row.reference ?? row.event_key,
                payload,
                isRetry: true,
              });
              if (res.forwarded) recovered++;
            }
          } catch (err) {
            console.error("[retry-crm-forwards] retry threw", err);
          }
        }

        // Leads that never even produced a delivery row (for example the app
        // was unreachable before logging), from the last 14 days.
        const since = new Date(now - 14 * 24 * 60 * 60 * 1000).toISOString();
        const { data: unsynced } = await supabaseAdmin
          .from("inspection_requests")
          .select("id")
          .is("crm_synced_at", null)
          .gte("created_at", since)
          .order("created_at", { ascending: true })
          .limit(BATCH);

        for (const lead of unsynced ?? []) {
          retried++;
          try {
            const { retryInspectionToCrm } = await import("@/lib/crm-lead-forward.server");
            const res = await retryInspectionToCrm(lead.id);
            if (res.forwarded) recovered++;
          } catch (err) {
            console.error("[retry-crm-forwards] lead retry threw", err);
          }
        }

        return Response.json({ ok: true, retried, recovered });
      },
    },
  },
});
