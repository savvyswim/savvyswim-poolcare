/**
 * Deploy health watchdog.
 *
 * Pinged by pg_cron (and manually after every deploy). It calls
 * /api/public/health on the published site, records the result in
 * ss_deploy_health_checks, and emails/texts the on-call address when the site
 * is not returning 200. The recorded history is what the in-app rollback
 * checklist (/admin/crm/deploy-health) reads to tell you which version to
 * restore.
 *
 * Public route: it performs no writes based on caller input and returns no PII.
 */
import { createFileRoute } from "@tanstack/react-router";
import { sendLovableEmail } from "@lovable.dev/email-js";

const DEFAULT_TARGET = "https://savvyswim.com";
const DEFAULT_EMAIL = "marcus@santanariveragroup.com";
const DEFAULT_PHONE = "+14697440379";
const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

type HealthPayload = {
  status?: string;
  bootId?: string;
  checks?: { name: string; ok: boolean; required: boolean; detail: string }[];
};

async function sendAlertEmail(subject: string, body: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return "no LOVABLE_API_KEY";
  const to = process.env["OPS_ALERT_EMAIL"] ?? DEFAULT_EMAIL;
  try {
    await sendLovableEmail(
      {
        to,
        from: "Savvy Swim Ops <noreply@notify.savvyswim.com>",
        sender_domain: "notify.savvyswim.com",
        subject,
        html: `<pre style="font:14px/1.5 monospace">${body.replace(/</g, "&lt;")}</pre>`,
        text: body,
        purpose: "transactional",
        label: "deploy-health-alert",
        idempotency_key: crypto.randomUUID(),
      },
      { apiKey },
    );
    return `emailed ${to}`;
  } catch (error) {
    console.error("[health-watch] email failed", error);
    return `email failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function sendAlertSms(body: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  const twilioKey = process.env["TWILIO_API_KEY"];
  if (!apiKey || !twilioKey) return "sms not configured";
  const to = process.env["OPS_ALERT_PHONE"] ?? DEFAULT_PHONE;
  const headers = { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": twilioKey };
  try {
    const numbersRes = await fetch(`${TWILIO_GATEWAY}/IncomingPhoneNumbers.json?PageSize=1`, { headers });
    if (!numbersRes.ok) return `twilio lookup ${numbersRes.status}: ${await numbersRes.text()}`;
    const numbers = (await numbersRes.json()) as { incoming_phone_numbers?: { phone_number: string }[] };
    const from = numbers.incoming_phone_numbers?.[0]?.phone_number;
    if (!from) return "no twilio number";
    const sendRes = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: from, Body: body.slice(0, 300) }),
    });
    if (!sendRes.ok) return `twilio send ${sendRes.status}: ${await sendRes.text()}`;
    return `texted ${to}`;
  } catch (error) {
    console.error("[health-watch] sms failed", error);
    return `sms failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function runWatch(request: Request) {
  const target = (process.env["HEALTH_WATCH_TARGET"] ?? DEFAULT_TARGET).replace(/\/$/, "");
  const url = `${target}/api/public/health`;

  let httpStatus: number | null = null;
  let payload: HealthPayload = {};
  let error: string | null = null;

  try {
    const res = await fetch(url, { headers: { "cache-control": "no-cache" } });
    httpStatus = res.status;
    payload = (await res.json().catch(() => ({}))) as HealthPayload;
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
  }

  const failedChecks = (payload.checks ?? []).filter((c) => !c.ok).map((c) => c.name);
  const healthy = httpStatus === 200 && payload.status !== "failed" && !error;
  const status = healthy ? (payload.status === "degraded" ? "degraded" : "ok") : "failed";

  const summary = [
    `Savvy Swim health check: ${status.toUpperCase()}`,
    `URL: ${url}`,
    `HTTP: ${httpStatus ?? "no response"}${error ? ` (${error})` : ""}`,
    `Boot id: ${payload.bootId ?? "unknown"}`,
    failedChecks.length ? `Failing: ${failedChecks.join(", ")}` : "All dependencies available",
    "",
    "Rollback: open the Lovable History tab and restore the last version that passed, then re-run `bun run test:smoke`.",
  ].join("\n");

  let alert = "not sent";
  if (!healthy) {
    console.error(JSON.stringify({ tag: "health-watch", status, httpStatus, failedChecks, error }));
    const [emailResult, smsResult] = await Promise.all([
      sendAlertEmail("Savvy Swim is DOWN — health check failed", summary),
      sendAlertSms(`Savvy Swim health check FAILED (HTTP ${httpStatus ?? "none"}). Check /admin/crm/deploy-health.`),
    ]);
    alert = `${emailResult}; ${smsResult}`;
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ss_deploy_health_checks").insert({
      status,
      http_status: httpStatus,
      boot_id: payload.bootId ?? null,
      failed_checks: failedChecks,
      detail: error ?? (healthy ? null : summary),
      alert_result: healthy ? null : alert,
      source: new URL(request.url).searchParams.get("source") ?? "cron",
    });
  } catch (e) {
    console.error("[health-watch] could not record result", e);
  }

  return Response.json({ status, httpStatus, failedChecks, alert }, { status: 200 });
}

export const Route = createFileRoute("/api/public/hooks/health-watch")({
  server: {
    handlers: {
      GET: async ({ request }) => runWatch(request),
      POST: async ({ request }) => runWatch(request),
    },
  },
});
