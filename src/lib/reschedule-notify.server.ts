/**
 * Builds and delivers the "your visit moved" confirmation that goes out the
 * moment a customer reschedules in /portal. Kept out of the *.functions.ts
 * wrapper so server-fn splitting never strips these helpers.
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
const OFFICE_PHONE = "(469) 744-0379";

export type RescheduleNotice = {
  firstName: string;
  when: string;
  slot: string;
  note: string | null;
  previousWhen: string | null;
  address: string | null;
  created: boolean;
};

export function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function windowFromNotes(notes: string | null): string {
  const match = /Preferred window:\s*([^—\n]+)/.exec(notes ?? "");
  return match?.[1]?.trim() || "8:00a – 4:00p";
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function smsBody(n: RescheduleNotice): string {
  const head = n.created
    ? `Savvy Swim: your pool service is booked for ${n.when}, arriving between ${n.slot}.`
    : `Savvy Swim: your pool service moved${n.previousWhen ? ` from ${n.previousWhen}` : ""} to ${n.when}, arriving between ${n.slot}.`;
  const note = n.note ? ` Note: ${n.note.replace(/\s+/g, " ").slice(0, 120)}` : "";
  return `${head}${note} Need another change? savvyswim.com/portal or ${OFFICE_PHONE}.`;
}

export function emailParts(n: RescheduleNotice): { subject: string; html: string; text: string } {
  const subject = n.created
    ? `Visit confirmed — ${n.when}`
    : `Visit updated — now ${n.when}`;
  const changed = n.previousWhen ? `<p style="margin:0 0 8px;font-size:14px;color:#7a6f63;text-decoration:line-through;">${esc(n.previousWhen)}</p>` : "";
  const html = `
<div style="background:#F4EFE3;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#2b2320;">
  <div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e5dcc9;">
    <div style="background:#8E1F2C;color:#F4EFE3;padding:20px 28px;">
      <div style="font-size:20px;font-weight:800;letter-spacing:.08em;">SAVVY SWIM</div>
      <div style="font-size:11px;letter-spacing:.14em;opacity:.85;margin-top:2px;">${n.created ? "VISIT CONFIRMED" : "SCHEDULE UPDATED"}</div>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 12px;font-size:15px;">Hi ${esc(n.firstName)},</p>
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
        ${n.created ? "You're on the schedule." : "Your service visit has been rescheduled."}
      </p>
      ${changed}
      <p style="margin:0 0 6px;font-size:18px;font-weight:800;">${esc(n.when)}</p>
      <p style="margin:0 0 16px;font-size:14px;">Arrival window <strong>${esc(n.slot)}</strong></p>
      ${n.address ? `<p style="margin:0 0 16px;font-size:14px;color:#7a6f63;">${esc(n.address)}</p>` : ""}
      ${n.note ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.6;border-left:3px solid #1FA9BE;padding-left:12px;">${esc(n.note)}</p>` : ""}
      <p style="margin:20px 0 0;font-size:12px;color:#7a6f63;line-height:1.6;">
        Please leave the gate unlocked and pets inside. Need another change? Use your
        <a href="https://savvyswim.com/portal" style="color:#1FA9BE;">customer portal</a> or call ${OFFICE_PHONE}.
      </p>
    </div>
    <div style="border-top:1px solid #e5dcc9;padding:14px 28px;font-size:11px;color:#9a8f82;">
      Savvy Swim · Dallas–Fort Worth · savvyswim.com
    </div>
  </div>
</div>`;
  const text =
    `Hi ${n.firstName},\n\n` +
    `${n.created ? "Your pool service visit is confirmed" : `Your pool service visit moved${n.previousWhen ? ` from ${n.previousWhen}` : ""}`} — ${n.when}, arriving between ${n.slot}.` +
    `${n.address ? `\n${n.address}` : ""}${n.note ? `\n\nNote: ${n.note}` : ""}\n\n` +
    `Need another change? https://savvyswim.com/portal or call ${OFFICE_PHONE}.\nSavvy Swim`;
  return { subject, html, text };
}

export async function sendSms(to: string, body: string): Promise<boolean> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  const twilioKey = process.env["TWILIO_API_KEY"];
  if (!apiKey || !twilioKey) return false;
  const headers = { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": twilioKey };
  try {
    const numbersRes = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json?PageSize=1`, { headers });
    if (!numbersRes.ok) {
      console.error(`[reschedule-notify] twilio numbers [${numbersRes.status}]: ${await numbersRes.text()}`);
      return false;
    }
    const numbers = (await numbersRes.json()) as { incoming_phone_numbers?: { phone_number?: string }[] };
    const from = numbers.incoming_phone_numbers?.[0]?.phone_number;
    if (!from) return false;
    const res = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: from, Body: body.slice(0, 320) }),
    });
    if (!res.ok) {
      console.error(`[reschedule-notify] twilio send [${res.status}]: ${await res.text()}`);
      return false;
    }
    return true;
  } catch (error) {
    console.error("[reschedule-notify] sms failed", error instanceof Error ? error.message : error);
    return false;
  }
}

export async function sendEmail(to: string, n: RescheduleNotice, key: string): Promise<boolean> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return false;
  const { subject, html, text } = emailParts(n);
  try {
    const { sendLovableEmail } = await import("@lovable.dev/email-js");
    await sendLovableEmail(
      {
        to,
        from: "Savvy Swim <noreply@notify.savvyswim.com>",
        sender_domain: "notify.savvyswim.com",
        subject,
        html,
        text,
        purpose: "transactional",
        label: "visit-reschedule",
        idempotency_key: `visit-reschedule:${key}`,
      },
      { apiKey },
    );
    return true;
  } catch (error) {
    console.error("[reschedule-notify] email failed", error instanceof Error ? error.message : error);
    return false;
  }
}
