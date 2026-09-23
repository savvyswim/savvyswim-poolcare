/**
 * Survey follow ups: after someone finishes the Savvy Swim survey we nudge them
 * to actually pick an inspection time. Three steps, 1 day, 3 days and 7 days
 * after the request came in. Email always (when we have a real address), text
 * as well when they opted in to messages.
 *
 * Every nudge is recorded in inspection_events with
 * detail = survey_followup_<hours>h, so a re-run never sends twice.
 */
import { sendLovableEmail } from "@lovable.dev/email-js";

import { logInspectionEvents } from "@/lib/inspection-events.server";

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";
const SENDER_DOMAIN = "notify.savvyswimservices.com";
const FROM_EMAIL = `Savvy Swim <noreply@${SENDER_DOMAIN}>`;
const REPLY_TO = "hi@savvyswim.com";
const OFFICE_PHONE = "(817) 663-7665";
const SITE = "https://savvyswim.com";

/** Hours after the survey came in. */
export const FOLLOWUP_OFFSETS = [24, 72, 168] as const;

/** Statuses that mean the lead is done, no nudging. */
const CLOSED_STATUSES = new Set([
  "scheduled",
  "booked",
  "won",
  "converted",
  "customer",
  "completed",
  "lost",
  "spam",
]);

type LeadRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  address: string;
  postal_code: string | null;
  status: string;
  source: string | null;
  sms_opt_in: boolean;
  converted_at: string | null;
  created_at: string;
  reference_number: string;
};

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] || "there";
}

/** True for the placeholder address we store when a survey had no email. */
function isPlaceholderEmail(email: string): boolean {
  return email.startsWith("no-email.");
}

function isPlaceholderAddress(address: string): boolean {
  return address.trim().toLowerCase() === "address not provided";
}

export function bookingLink(lead: LeadRow): string {
  const params = new URLSearchParams();
  if (lead.full_name) params.set("name", lead.full_name);
  if (lead.phone) params.set("phone", lead.phone);
  if (lead.email && !isPlaceholderEmail(lead.email)) params.set("email", lead.email);
  if (lead.address && !isPlaceholderAddress(lead.address)) params.set("address", lead.address);
  params.set("ref", lead.reference_number);
  return `${SITE}/book?${params.toString()}`;
}

type Step = { heading: string; subject: string; line: string; sms: string };

function copyFor(hours: number, name: string, link: string): Step {
  if (hours === 24) {
    return {
      subject: "Your free pool inspection is ready to book",
      heading: `Thanks for the answers, ${name}`,
      line: "Your first inspection is free, no commitment. Pick a day that works and we will run a full water test, check the whole system and hand you a written report.",
      sms: `Savvy Swim: thanks for the survey, ${name}. Your free pool inspection is ready to book: ${link}`,
    };
  }
  if (hours === 72) {
    return {
      subject: "Still want that free water test?",
      heading: `${name}, your free inspection is still open`,
      line: "Full water test, equipment walkthrough and a flat monthly price before we leave. Switch to us and your first filter cleaning is free too.",
      sms: `Savvy Swim: your free pool inspection and water test are still open, ${name}. Grab a time: ${link}`,
    };
  }
  return {
    subject: "Last call on your free pool inspection",
    heading: `${name}, want us to take a look this week?`,
    line: `Your free inspection is still yours to claim. Book online in under a minute, or call us at ${OFFICE_PHONE} and we will find a time for you.`,
    sms: `Savvy Swim: last call on your free pool inspection, ${name}. Book here: ${link} or call ${OFFICE_PHONE}`,
  };
}

async function sendEmail(lead: LeadRow, hours: number, link: string): Promise<boolean> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return false;
  const name = firstName(lead.full_name);
  const step = copyFor(hours, name, link);
  const text = `${step.heading}\n\n${step.line}\n\nPick your time: ${link}\n\nQuestions? Call ${OFFICE_PHONE}.`;
  try {
    await sendLovableEmail(
      {
        to: lead.email,
        from: FROM_EMAIL,
        sender_domain: SENDER_DOMAIN,
        reply_to: REPLY_TO,
        subject: step.subject,
        html: `<div style="font-family:Helvetica,Arial,sans-serif;color:#1c1c1c;max-width:560px">
  <p style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#8E1F2C;margin:0 0 12px">Savvy Swim · Free inspection</p>
  <h1 style="font-size:22px;margin:0 0 12px">${esc(step.heading)}</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 20px">${esc(step.line)}</p>
  <p style="margin:0 0 20px"><a href="${link}" style="background:#8E1F2C;color:#F4EFE3;text-decoration:none;padding:14px 22px;display:inline-block;font-weight:700">Pick my inspection time</a></p>
  <p style="font-size:14px;line-height:1.6;margin:0;color:#555">Rather talk it through? Call ${OFFICE_PHONE}. Reference ${esc(lead.reference_number)}.</p>
</div>`,
        text,
        purpose: "transactional",
        label: `survey-followup-${hours}h`,
        idempotency_key: `survey-followup:${hours}h:${lead.id}`,
      },
      { apiKey },
    );
    return true;
  } catch (error) {
    console.error("[survey-followups] email failed", error instanceof Error ? error.message : error);
    return false;
  }
}

async function sendSms(lead: LeadRow, hours: number, link: string): Promise<boolean> {
  const { hasSmsOptIn, withSmsFooter } = await import("@/lib/sms-compliance.server");
  if (!(await hasSmsOptIn(lead.phone))) return false;
  const apiKey = process.env["LOVABLE_API_KEY"];
  const twilioKey = process.env["TWILIO_API_KEY"];
  if (!apiKey || !twilioKey) return false;
  const body = withSmsFooter(copyFor(hours, firstName(lead.full_name), link).sms);
  const headers = { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": twilioKey };
  try {
    const numbersRes = await fetch(`${TWILIO_GATEWAY}/IncomingPhoneNumbers.json?PageSize=1`, { headers });
    if (!numbersRes.ok) return false;
    const numbers = (await numbersRes.json()) as { incoming_phone_numbers?: { phone_number: string }[] };
    const from = numbers.incoming_phone_numbers?.[0]?.phone_number;
    if (!from) return false;
    const res = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: lead.phone, From: from, Body: body.slice(0, 320) }),
    });
    return res.ok;
  } catch (error) {
    console.error("[survey-followups] sms failed", error instanceof Error ? error.message : error);
    return false;
  }
}

export type FollowupResult = {
  checked: number;
  emails: number;
  texts: number;
  skipped: number;
};

/** One pass over survey leads that are due for a nudge. */
export async function runSurveyFollowups(): Promise<FollowupResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = Date.now();
  const lastOffset = FOLLOWUP_OFFSETS[FOLLOWUP_OFFSETS.length - 1] ?? 168;
  const oldest = new Date(now - (lastOffset + 48) * 3600_000);


  const { data, error } = await supabaseAdmin
    .from("inspection_requests")
    .select(
      "id, full_name, email, phone, address, postal_code, status, source, sms_opt_in, converted_at, created_at, reference_number",
    )
    .like("source", "%survey%")
    .is("converted_at", null)
    .gte("created_at", oldest.toISOString())
    .limit(500);

  if (error) {
    console.error("[survey-followups] query failed", error.message);
    throw new Error("query failed");
  }

  const leads = (data ?? []) as LeadRow[];
  const result: FollowupResult = { checked: leads.length, emails: 0, texts: 0, skipped: 0 };
  if (!leads.length) return result;

  const { data: priorEvents } = await supabaseAdmin
    .from("inspection_events")
    .select("request_id, detail")
    .like("detail", "survey_followup_%")
    .in("request_id", leads.map((l) => l.id));
  const already = new Set((priorEvents ?? []).map((e) => `${e.request_id}|${e.detail}`));

  for (const lead of leads) {
    if (CLOSED_STATUSES.has((lead.status ?? "").toLowerCase())) {
      result.skipped += 1;
      continue;
    }
    const ageHours = (now - new Date(lead.created_at).getTime()) / 3600_000;
    // Newest due step only, one nudge per run.
    const due = [...FOLLOWUP_OFFSETS]
      .sort((a, b) => b - a)
      .find((h) => ageHours >= h && !already.has(`${lead.id}|survey_followup_${h}h`));
    if (!due) {
      result.skipped += 1;
      continue;
    }

    const detail = `survey_followup_${due}h`;
    const link = bookingLink(lead);
    const events: Parameters<typeof logInspectionEvents>[1] = [];

    if (!isPlaceholderEmail(lead.email)) {
      const ok = await sendEmail(lead, due, link);
      if (ok) result.emails += 1;
      events.push({
        eventType: ok ? "email_sent" : "email_failed",
        channel: "email",
        recipient: lead.email,
        outcome: ok ? "sent" : "failed",
        detail,
      });
    }

    if (lead.sms_opt_in && lead.phone) {
      const ok = await sendSms(lead, due, link);
      if (ok) result.texts += 1;
      events.push({
        eventType: ok ? "sms_sent" : "sms_failed",
        channel: "sms",
        recipient: lead.phone,
        outcome: ok ? "sent" : "failed",
        detail,
      });
    }

    if (events.length === 0) {
      result.skipped += 1;
      continue;
    }
    await logInspectionEvents(lead.id, events);
  }

  return result;
}
