/**
 * Shared on-call alert transport (email + SMS) for ops watchdogs.
 *
 * Server-only: reads LOVABLE_API_KEY / TWILIO_API_KEY at call time and never
 * throws. A failed alert must not take down the watchdog that raised it.
 */
import { sendLovableEmail } from "@lovable.dev/email-js";

const DEFAULT_EMAIL = "marcus@santanariveragroup.com";
const DEFAULT_PHONE = "+18176637665";
const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";

export async function sendOpsAlertEmail(
  subject: string,
  body: string,
  label = "ops-alert",
): Promise<string> {
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
        label,
        idempotency_key: crypto.randomUUID(),
      },
      { apiKey },
    );
    return `emailed ${to}`;
  } catch (error) {
    return `email failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export async function sendOpsAlertSms(body: string): Promise<string> {
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
