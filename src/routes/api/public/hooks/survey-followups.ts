/**
 * Daily survey follow up run. Nudges survey leads at 1 day, 3 days and 7 days
 * with a prefilled booking link, by email and by text when they opted in.
 *
 * Called by pg_cron once a day. Guarded by the ops shared secret, returns
 * counts only, never PII.
 */
import { createFileRoute } from "@tanstack/react-router";

import { guardOpsHook } from "@/lib/ops-hook-auth.server";

async function run(request: Request) {
  const denied = guardOpsHook(request, "survey-followups");
  if (denied) return denied;
  const { runSurveyFollowups } = await import("@/lib/survey-followup.server");
  try {
    const result = await runSurveyFollowups();
    return Response.json({ ok: true, ...result });
  } catch (error) {
    console.error("[survey-followups] run failed", error instanceof Error ? error.message : error);
    return Response.json({ error: "run failed" }, { status: 500 });
  }
}

export const Route = createFileRoute("/api/public/hooks/survey-followups")({
  server: {
    handlers: {
      GET: ({ request }) => run(request),
      POST: ({ request }) => run(request),
    },
  },
});
