/**
 * Alert sink for the automated smoke test.
 *
 * `bun run test:smoke` (and any CI/deploy hook running it) POSTs its failure
 * summary here; we page on-call by email + SMS. Guarded by OPS_HOOK_SECRET so
 * an anonymous caller can never trigger outbound messages.
 *
 *   POST /api/public/hooks/smoke-alert
 *   { "target": "https://savvyswimservices.com", "failures": [...], "summary": "..." }
 */
import { createFileRoute } from "@tanstack/react-router";

import { guardOpsHook } from "@/lib/ops-hook-auth.server";
import { sendOpsAlertEmail, sendOpsAlertSms } from "@/lib/ops-alert.server";

type Payload = {
  target?: string;
  summary?: string;
  failures?: { route: string; status?: number | null; note?: string }[];
};

export const Route = createFileRoute("/api/public/hooks/smoke-alert")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = guardOpsHook(request, "smoke-alert");
        if (denied) return denied;

        let payload: Payload;
        try {
          payload = (await request.json()) as Payload;
        } catch {
          return Response.json({ error: "invalid json" }, { status: 400 });
        }

        const failures = Array.isArray(payload.failures) ? payload.failures.slice(0, 25) : [];
        if (failures.length === 0) {
          return Response.json({ ok: true, alert: "no failures. Nothing sent" });
        }

        const target = typeof payload.target === "string" ? payload.target.slice(0, 200) : "unknown target";
        const summary =
          (typeof payload.summary === "string" ? payload.summary.slice(0, 4000) : "") ||
          failures.map((f) => `${f.route} -> ${f.status ?? "no response"} (${f.note ?? ""})`).join("\n");

        console.error(JSON.stringify({ tag: "smoke", target, failures }));

        const first = failures[0];
        const [email, sms] = await Promise.all([
          sendOpsAlertEmail(
            `Savvy Swim smoke test FAILED, ${failures.length} route(s)`,
            `${summary}\n\nTarget: ${target}`,
            "smoke-alert",
          ),
          sendOpsAlertSms(
            `Savvy Swim smoke FAILED: ${failures.length} route(s). First: ${first?.route} ${first?.status ?? "ERR"}. See /admin/canary.`,
          ),
        ]);

        return Response.json({ ok: true, failures: failures.length, email, sms });
      },
    },
  },
});
