/**
 * Daily traffic roll up push to the CRM.
 *
 * Called on a schedule (pg_cron or any external scheduler) with the ops shared
 * secret. Sends counts only, no personal details.
 */
import { createFileRoute } from "@tanstack/react-router";

import { guardOpsHook } from "@/lib/ops-hook-auth.server";

async function run(request: Request): Promise<Response> {
  const denied = guardOpsHook(request, "crm-traffic-daily");
  if (denied) return denied;
  const { pushDailyTrafficToCrm } = await import("@/lib/crm-analytics-push.server");
  const result = await pushDailyTrafficToCrm();
  return Response.json(result, { status: result.sent ? 200 : 502 });
}

export const Route = createFileRoute("/api/public/hooks/crm-traffic-daily")({
  server: {
    handlers: {
      GET: ({ request }) => run(request),
      POST: ({ request }) => run(request),
    },
  },
});
