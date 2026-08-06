/**
 * Post-deploy canary endpoint.
 *
 * Repeatedly hits the deployed site and records every 5xx, timeout, blank page
 * or SSR crash body — with the captured stack trace and response snippet — in
 * ss_canary_runs / ss_canary_incidents, then emails + texts on-call when the
 * run fails. Call after every deploy and on a schedule:
 *
 *   GET /api/public/hooks/canary?rounds=3&source=post-deploy
 *
 * Public route: it takes no untrusted writes and returns no PII.
 */
import { createFileRoute } from "@tanstack/react-router";
import { sendLovableEmail } from "@lovable.dev/email-js";

import { runCanary, summarizeCanary, DEFAULT_CANARY_ROUTES } from "@/lib/canary";

const DEFAULT_TARGET = "https://savvyswim.com";
const DEFAULT_EMAIL = "marcus@santanariveragroup.com";
const DEFAULT_PHONE = "+14697440379";
const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

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
        html: `<pre style="font:13px/1.5 monospace;white-space:pre-wrap">${body.replace(/</g, "&lt;")}</pre>`,
        text: body,
        purpose: "transactional",
        label: "canary-alert",
        idempotency_key: crypto.randomUUID(),
      },
      { apiKey },
    );
    return `emailed ${to}`;
  } catch (error) {
    console.error("[canary] email failed", error);
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
    if (!numbersRes.ok) return `twilio lookup ${numbersRes.status}`;
    const numbers = (await numbersRes.json()) as { incoming_phone_numbers?: { phone_number: string }[] };
    const from = numbers.incoming_phone_numbers?.[0]?.phone_number;
    if (!from) return "no twilio number";
    const sendRes = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: from, Body: body.slice(0, 300) }),
    });
    if (!sendRes.ok) return `twilio send ${sendRes.status}`;
    return `texted ${to}`;
  } catch (error) {
    console.error("[canary] sms failed", error);
    return `sms failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function handle(request: Request) {
  const params = new URL(request.url).searchParams;
  const target = (params.get("target") ?? process.env["HEALTH_WATCH_TARGET"] ?? DEFAULT_TARGET).replace(/\/$/, "");
  const rounds = Number(params.get("rounds") ?? 3);
  const source = params.get("source") ?? "cron";

  const run = await runCanary({
    target,
    rounds: Number.isFinite(rounds) ? rounds : 3,
    routes: DEFAULT_CANARY_ROUTES,
    delayMs: Number(params.get("delayMs") ?? 750),
  });

  const summary = summarizeCanary(run);

  let alert = "not sent";
  if (run.status === "failed") {
    // Structured log so the failure is greppable in server logs alongside the trace.
    console.error(
      JSON.stringify({
        tag: "canary",
        target: run.target,
        failures: run.failures,
        requests: run.requests,
        incidents: run.incidents.map((i) => ({
          route: i.route,
          kind: i.kind,
          httpStatus: i.httpStatus,
          durationMs: i.durationMs,
          message: i.message,
          stack: i.stack,
        })),
      }),
    );
    const [emailResult, smsResult] = await Promise.all([
      sendAlertEmail(`Savvy Swim canary FAILED — ${run.failures}/${run.requests} requests`, summary),
      sendAlertSms(`Savvy Swim canary FAILED: ${run.incidents[0]?.route} ${run.incidents[0]?.message}. See /admin/crm/deploy-health.`),
    ]);
    alert = `${emailResult}; ${smsResult}`;
  }

  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: inserted, error } = await supabaseAdmin
      .from("ss_canary_runs")
      .insert({
        started_at: run.startedAt,
        finished_at: run.finishedAt,
        target: run.target,
        source,
        rounds: run.rounds,
        requests: run.requests,
        failures: run.failures,
        slowest_ms: run.slowestMs,
        status: run.status,
        alert_result: run.status === "failed" ? alert : null,
      })
      .select("id")
      .single();
    if (error) throw error;

    if (inserted && run.incidents.length > 0) {
      await supabaseAdmin.from("ss_canary_incidents").insert(
        run.incidents.map((i) => ({
          run_id: inserted.id,
          route: i.route,
          url: i.url,
          round: i.round,
          kind: i.kind,
          http_status: i.httpStatus,
          duration_ms: i.durationMs,
          message: i.message,
          stack: i.stack,
          body_snippet: i.bodySnippet,
        })),
      );
    }
  } catch (e) {
    console.error("[canary] could not record run", e);
  }

  return Response.json(
    {
      status: run.status,
      target: run.target,
      requests: run.requests,
      failures: run.failures,
      slowestMs: run.slowestMs,
      incidents: run.incidents.map(({ route, round, kind, httpStatus, durationMs, message, stack }) => ({
        route,
        round,
        kind,
        httpStatus,
        durationMs,
        message,
        stack,
      })),
      alert,
    },
    { status: 200 },
  );
}

export const Route = createFileRoute("/api/public/hooks/canary")({
  server: {
    handlers: {
      GET: async ({ request }) => handle(request),
      POST: async ({ request }) => handle(request),
    },
  },
});
