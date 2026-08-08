/**
 * Per-account failure-rate watchdog.
 *
 * Runs every 5 minutes from pg_cron. It reads the last 15 minutes of webhook
 * audit events out of ss_security_audit, groups them by the customer account
 * recorded in details.customerId, and alerts on-call when an account's failure
 * rate crosses the threshold.
 *
 * Deduping is per account: ss_failure_alerts keeps one row per account with
 * last_alerted_at, and we stay quiet for the cooldown window so one bad account
 * can't text the whole afternoon.
 *
 * Public route: no caller input drives writes and no PII is returned.
 */
import { createFileRoute } from "@tanstack/react-router";
import { sendLovableEmail } from "@lovable.dev/email-js";

const DEFAULT_EMAIL = "marcus@santanariveragroup.com";
const DEFAULT_PHONE = "+14697440379";
const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

const WINDOW_MINUTES = 15;
// Below this many events a single failure looks like 100% — ignore the noise.
const MIN_EVENTS = 5;
const DEFAULT_THRESHOLD_PCT = 25;
const COOLDOWN_MINUTES = 60;

type AuditRow = {
  success: boolean;
  created_at: string;
  details: Record<string, unknown> | null;
};

type Bucket = {
  key: string;
  name: string;
  total: number;
  failed: number;
};

function num(value: string | null, fallback: number): number {
  const n = value === null ? NaN : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

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
        label: "failure-rate-alert",
        idempotency_key: crypto.randomUUID(),
      },
      { apiKey },
    );
    return `emailed ${to}`;
  } catch (error) {
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
    return `sms failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function runWatch(request: Request) {
  const params = new URL(request.url).searchParams;
  const thresholdPct = Math.min(100, Math.max(1, num(params.get("threshold"), DEFAULT_THRESHOLD_PCT)));
  const minEvents = Math.max(1, num(params.get("minEvents"), MIN_EVENTS));
  const cooldownMin = Math.max(1, num(params.get("cooldown"), COOLDOWN_MINUTES));
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("ss_security_audit")
    .select("success, created_at, details")
    .like("action", "twilio_status_webhook%")
    .gte("created_at", since)
    .limit(2000);

  if (error) {
    console.error("[failure-rate-watch] query failed", error.message);
    return Response.json({ error: "query failed" }, { status: 500 });
  }

  const buckets = new Map<string, Bucket>();
  for (const row of (data ?? []) as AuditRow[]) {
    const details = (row.details ?? {}) as { customerId?: string; customerName?: string };
    const key = details.customerId ?? "unattributed";
    const name = details.customerName ?? (key === "unattributed" ? "Unattributed / pre-verification" : key);
    const bucket = buckets.get(key) ?? { key, name, total: 0, failed: 0 };
    bucket.total += 1;
    if (!row.success) bucket.failed += 1;
    buckets.set(key, bucket);
  }

  const breaching = [...buckets.values()]
    .map((b) => ({ ...b, rate: b.total ? (b.failed / b.total) * 100 : 0 }))
    .filter((b) => b.total >= minEvents && b.rate >= thresholdPct)
    .sort((a, b) => b.rate - a.rate);

  const cutoff = new Date(Date.now() - cooldownMin * 60_000).toISOString();
  const results: { account: string; rate: number; alerted: boolean; reason: string }[] = [];

  for (const b of breaching) {
    const { data: prior } = await supabaseAdmin
      .from("ss_failure_alerts")
      .select("id, last_alerted_at, alert_count")
      .eq("account_key", b.key)
      .maybeSingle();

    // Dedupe per account: one alert per cooldown window, no matter how many
    // cron ticks see the same spike.
    if (prior && prior.last_alerted_at > cutoff) {
      results.push({ account: b.name, rate: b.rate, alerted: false, reason: "cooldown" });
      continue;
    }

    const summary = [
      `Savvy Swim FAILURE RATE ALERT`,
      `Account: ${b.name}`,
      `Window: last ${WINDOW_MINUTES} minutes`,
      `Failures: ${b.failed} of ${b.total} events (${b.rate.toFixed(1)}%)`,
      `Threshold: ${thresholdPct}%`,
      "",
      "Review: /admin/crm/audit-trail → failures by account.",
    ].join("\n");

    console.warn(
      JSON.stringify({
        tag: "failure-rate-alert",
        account: b.key,
        total: b.total,
        failed: b.failed,
        rate: Number(b.rate.toFixed(2)),
        thresholdPct,
      }),
    );

    const [emailResult, smsResult] = await Promise.all([
      sendAlertEmail(`Savvy Swim: ${b.rate.toFixed(0)}% failure rate — ${b.name}`, summary),
      sendAlertSms(
        `Savvy Swim: ${b.name} at ${b.rate.toFixed(0)}% failures (${b.failed}/${b.total}) in ${WINDOW_MINUTES}m.`,
      ),
    ]);
    const alertResult = `${emailResult}; ${smsResult}`;

    await supabaseAdmin.from("ss_failure_alerts").upsert(
      {
        account_key: b.key,
        account_name: b.name,
        window_minutes: WINDOW_MINUTES,
        total_events: b.total,
        failed_events: b.failed,
        failure_rate: Number(b.rate.toFixed(2)),
        threshold_pct: thresholdPct,
        alert_result: alertResult,
        alert_count: (prior?.alert_count ?? 0) + 1,
        last_alerted_at: new Date().toISOString(),
      },
      { onConflict: "account_key" },
    );

    results.push({ account: b.name, rate: b.rate, alerted: true, reason: alertResult });
  }

  return Response.json({
    windowMinutes: WINDOW_MINUTES,
    thresholdPct,
    minEvents,
    cooldownMinutes: cooldownMin,
    accountsChecked: buckets.size,
    breaching: breaching.length,
    results,
  });
}

export const Route = createFileRoute("/api/public/hooks/failure-rate-watch")({
  server: {
    handlers: {
      GET: async ({ request }) => runWatch(request),
      POST: async ({ request }) => runWatch(request),
    },
  },
});
