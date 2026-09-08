/**
 * Production error monitoring for server-side (SSR / server route / middleware)
 * crashes.
 *
 * Every unhandled server error is fingerprinted, written to ss_server_errors,
 * and. The first time a fingerprint is seen within the alert window, emailed
 * and texted to the on-call address so an SSR crash is noticed immediately
 * instead of by a customer.
 *
 * Nothing here may throw: monitoring must never be the reason a request fails.
 */
import { describeError } from "./error-capture";

const DEFAULT_EMAIL = "marcus@santanariveragroup.com";
const DEFAULT_PHONE = "+18176637665";
const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

// One alert per distinct failure per window. A crashing route can fire
// hundreds of times a minute and we don't want to text on every request.
const ALERT_WINDOW_MS = 15 * 60 * 1000;
const alerted = new Map<string, number>();

export type ServerErrorReport = {
  error: unknown;
  source?: "ssr" | "server-route" | "middleware" | "worker";
  request?: Request;
  statusCode?: number;
  bootId?: string | null;
};

function fingerprintOf(message: string, route: string | null): string {
  const normalized = message
    .replace(/0x[0-9a-f]+/gi, "0x*")
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, "*")
    .replace(/\d+/g, "*")
    .slice(0, 180);
  return `${route ?? "-"}::${normalized}`;
}

function shouldAlert(fingerprint: string): boolean {
  const now = Date.now();
  const last = alerted.get(fingerprint);
  if (last && now - last < ALERT_WINDOW_MS) return false;
  alerted.set(fingerprint, now);
  if (alerted.size > 200) alerted.clear();
  return true;
}

async function sendAlertEmail(subject: string, body: string): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return "no LOVABLE_API_KEY";
  const to = process.env["OPS_ALERT_EMAIL"] ?? DEFAULT_EMAIL;
  try {
    const { sendLovableEmail } = await import("@lovable.dev/email-js");
    await sendLovableEmail(
      {
        to,
        from: "Savvy Swim Ops <noreply@notify.savvyswimservices.com>",
        sender_domain: "notify.savvyswimservices.com",
        subject,
        html: `<pre style="font:13px/1.5 monospace;white-space:pre-wrap">${body.replace(/</g, "&lt;")}</pre>`,
        text: body,
        purpose: "transactional",
        label: "server-error-alert",
        idempotency_key: crypto.randomUUID(),
      },
      { apiKey },
    );
    return `emailed ${to}`;
  } catch (e) {
    return `email failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function sendAlertSms(body: string): Promise<string> {
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
  } catch (e) {
    return `sms failed: ${e instanceof Error ? e.message : String(e)}`;
  }
}

export async function reportServerError(report: ServerErrorReport): Promise<void> {
  try {
    const err = report.error;
    const message =
      err instanceof Error ? err.message : typeof err === "string" ? err : String(err);
    const detail = describeError(err);
    const url = report.request ? new URL(report.request.url) : null;
    const route = url ? url.pathname : null;
    const fingerprint = fingerprintOf(message || "unknown server error", route);
    const source = report.source ?? "ssr";

    // Structured log first. It lands in worker logs even if the DB write fails.
    console.warn(
      JSON.stringify({
        tag: "server-error",
        source,
        route,
        fingerprint,
        message: message.slice(0, 300),
        statusCode: report.statusCode ?? 500,
      }),
    );

    const alerting = shouldAlert(fingerprint);
    let alertResult: string | null = null;

    if (alerting) {
      const summary = [
        `Savvy Swim SERVER ERROR (${source})`,
        `Route: ${route ?? "unknown"}${report.request ? ` [${report.request.method}]` : ""}`,
        `Status: ${report.statusCode ?? 500}`,
        `Message: ${message}`,
        "",
        detail.slice(0, 3000),
        "",
        "Review: /admin/crm/deploy-health → Server errors.",
      ].join("\n");
      const [email, sms] = await Promise.all([
        sendAlertEmail(`Savvy Swim server error on ${route ?? "unknown route"}`, summary),
        sendAlertSms(`Savvy Swim SERVER ERROR on ${route ?? "?"}: ${message.slice(0, 120)}`),
      ]);
      alertResult = `${email}; ${sms}`;
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("ss_server_errors").insert({
      fingerprint,
      source,
      message: message.slice(0, 500),
      stack: detail.slice(0, 6000),
      route,
      method: report.request?.method ?? null,
      status_code: report.statusCode ?? 500,
      boot_id: report.bootId ?? null,
      user_agent: report.request?.headers.get("user-agent")?.slice(0, 300) ?? null,
      ip_address:
        report.request?.headers.get("cf-connecting-ip") ??
        report.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        null,
      alert_sent: alerting,
      alert_result: alertResult,
    });
  } catch {
    // Monitoring must never break the request.
  }
}
