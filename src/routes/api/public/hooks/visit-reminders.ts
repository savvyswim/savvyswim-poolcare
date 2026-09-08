/**
 * Appointment reminders for customers, configurable lead times.
 *
 * Runs hourly from pg_cron. For every upcoming visit we work out how many hours
 * away the arrival window starts, then compare that against the reminder offsets
 * configured for the appointment type in ss_reminder_schedules (CRM → Settings →
 * Reminder schedule). A row looks like:
 *
 *   appointment_type 'Weekly Service' · offsets_hours {48,24,2} · enabled true
 *
 * Appointment type is the customer's service level; the 'default' row covers
 * anything without its own schedule.
 *
 * Channel follows /portal → Property profile:
 *   notify_visits = false  → never remind (hard opt-out)
 *   preferred_contact sms  → text message (Twilio)
 *   preferred_contact phone→ text message (we can't robo-dial, so we text)
 *   preferred_contact email→ branded email
 *
 * Deduping: every reminder writes an ss_feed row tied to the visit
 * (kind = 'reminder' for the 24h notice, 'reminder_<n>h' for the others), and we
 * skip any visit that already has one for that offset. So a re-run never
 * double-texts. Rescheduling clears those rows so the new date re-arms them.
 *
 * Public route: takes no caller input that drives writes and returns no PII.
 */
import { createFileRoute } from "@tanstack/react-router";

import { guardOpsHook } from "@/lib/ops-hook-auth.server";
import { sendLovableEmail } from "@lovable.dev/email-js";

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";
const SENDER_DOMAIN = "notify.savvyswimservices.com";
const FROM_EMAIL = "Savvy Swim <noreply@notify.savvyswimservices.com>";
const OFFICE_PHONE = "(817) 663-7665";
const DEFAULT_OFFSETS = [24, 2];

type Customer = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  service_level: string | null;
  gate_code: string | null;
  notify_visits: boolean | null;
  preferred_contact: string | null;
};

type VisitRow = {
  id: string;
  customer_id: string;
  scheduled_date: string;
  notes: string | null;
  ss_customers: Customer | null;
};

/** Current date/time in America/Chicago. */
function nowCT(): Date {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }));
}

function isoDate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function windowFromNotes(notes: string | null): string {
  const match = /Preferred window:\s*([^, \n]+)/.exec(notes ?? "");
  return match?.[1]?.trim() || "8:00a – 4:00p";
}

/** First hour (0-23, CT) of an arrival window label like "10:00a – 12:00p". */
function windowStartHour(slot: string): number {
  const m = /(\d{1,2})(?::(\d{2}))?\s*([ap])/i.exec(slot);
  if (!m) return 8;
  let hour = Number(m[1]) % 12;
  if ((m[3] ?? "a").toLowerCase() === "p") hour += 12;
  return hour;
}

/** ss_feed kind for a given offset, 24h keeps the legacy 'reminder' kind. */
function feedKindFor(offset: number): string {
  return offset === 24 ? "reminder" : `reminder_${offset}h`;
}

/** "in 2 days" / "tomorrow" / "in about 2 hours" */
function leadLabel(offset: number, when: string): string {
  if (offset >= 36) return `in ${Math.round(offset / 24)} days, on ${when}`;
  if (offset >= 12) return `tomorrow, ${when}`;
  return `in about ${offset} ${offset === 1 ? "hour" : "hours"}`;
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function twilioSend(to: string, rawBody: string): Promise<boolean> {
  const { hasSmsOptIn, withSmsFooter } = await import("@/lib/sms-compliance.server");
  if (!(await hasSmsOptIn(to))) return false;
  const body = withSmsFooter(rawBody);
  const apiKey = process.env["LOVABLE_API_KEY"];
  const twilioKey = process.env["TWILIO_API_KEY"];
  if (!apiKey || !twilioKey) return false;
  const headers = { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": twilioKey };
  try {
    const numbersRes = await fetch(`${TWILIO_GATEWAY}/IncomingPhoneNumbers.json?PageSize=1`, { headers });
    if (!numbersRes.ok) return false;
    const numbers = (await numbersRes.json()) as { incoming_phone_numbers?: { phone_number: string }[] };
    const from = numbers.incoming_phone_numbers?.[0]?.phone_number;
    if (!from) return false;
    const res = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
      method: "POST",
      headers: { ..headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: from, Body: body.slice(0, 320) }),
    });
    return res.ok;
  } catch (error) {
    console.error("[visit-reminders] twilio failed", error instanceof Error ? error.message : error);
    return false;
  }
}

async function emailReminder(
  to: string,
  customer: Customer,
  when: string,
  slot: string,
  visitId: string,
  offset: number,
): Promise<boolean> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return false;
  const first = customer.full_name?.split(" ")[0] ?? "there";
  const where = [customer.address, customer.city].filter(Boolean).join(", ");
  const soon = offset < 12;
  const lead = leadLabel(offset, when);
  const subject = soon
    ? `Your pool service is about ${offset} hours out, ${slot}`
    : `Your pool service is ${lead}`;
  const text =
    `Hi ${first}, a quick reminder that your Savvy Swim visit is ${lead}, ` +
    `arriving between ${slot}.${where ? ` We'll be at ${where}.` : ""}\n\n` +
    `Please leave the gate unlocked and pets inside. Need to move it? Reschedule anytime in your portal ` +
    `at https://savvyswimservices.com/portal or call ${OFFICE_PHONE}.`;

  try {
    await sendLovableEmail(
      {
        to,
        from: FROM_EMAIL,
        sender_domain: SENDER_DOMAIN,
        reply_to: "hi@savvyswim.com",
        subject,
        html: `<div style="font-family:Helvetica,Arial,sans-serif;color:#1c1c1c;max-width:560px">
  <p style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#8E1F2C;margin:0 0 12px">Savvy Swim · Visit reminder</p>
  <h1 style="font-size:22px;margin:0 0 12px">Hi ${esc(first)}, ${soon ? `your tech is about ${offset} hours out.` : `we're on the schedule ${esc(lead)}.`}</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 8px"><strong>${esc(when)}</strong> · arriving between <strong>${esc(slot)}</strong></p>
  ${where ? `<p style="font-size:15px;line-height:1.6;margin:0 0 8px">${esc(where)}</p>` : ""}
  <p style="font-size:15px;line-height:1.6;margin:16px 0">Please leave the gate unlocked and pets inside so your tech can get straight to work.</p>
  <p style="font-size:15px;line-height:1.6;margin:16px 0">Need to move it? Reschedule anytime in your <a href="https://savvyswimservices.com/portal" style="color:#1FA9BE">customer portal</a> or call ${OFFICE_PHONE}.</p>
</div>`,
        text,
        purpose: "transactional",
        label: `visit-reminder-${offset}h`,
        idempotency_key: `visit-reminder:${offset}h:${visitId}`,
      },
      { apiKey },
    );
    return true;
  } catch (error) {
    console.error("[visit-reminders] email failed", error instanceof Error ? error.message : error);
    return false;
  }
}

async function run(request: Request) {
  const denied = guardOpsHook(request, "visit-reminders");
  if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const dateFilter = params.get("date");
  if (dateFilter && !/^\d{4}-\d{2}-\d{2}$/.test(dateFilter)) {
    return Response.json({ error: "bad date" }, { status: 400 });
  }
  const ct = nowCT();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Configurable offsets per appointment type.
  const { data: scheduleRows } = await supabaseAdmin
    .from("ss_reminder_schedules")
    .select("appointment_type, offsets_hours, enabled");
  const schedules = new Map<string, number[]>();
  for (const row of scheduleRows ?? []) {
    if (row.enabled === false) continue;
    const offsets = (row.offsets_hours ?? [])
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0 && n <= 336)
      .sort((a, b) => b - a);
    schedules.set(row.appointment_type, offsets);
  }
  const fallback = schedules.get("default") ?? DEFAULT_OFFSETS;
  const maxOffset = Math.max(fallback[0] ?? 24, ..[..schedules.values()].map((o) => o[0] ?? 0));

  const from = dateFilter ?? isoDate(ct);
  const horizon = new Date(ct.getTime() + (maxOffset + 24) * 3600_000);
  const to = dateFilter ?? isoDate(horizon);

  const { data, error } = await supabaseAdmin
    .from("ss_visits")
    .select(
      "id, customer_id, scheduled_date, notes, " +
        "ss_customers(id, full_name, email, phone, address, city, service_level, gate_code, notify_visits, preferred_contact)",
    )
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .in("status", ["scheduled", "pending", "en_route"])
    .limit(1000);

  if (error) {
    console.error("[visit-reminders] query failed", error.message);
    return Response.json({ error: "query failed" }, { status: 500 });
  }

  const visits = (data ?? []) as unknown as VisitRow[];
  if (!visits.length) return Response.json({ from, to, sms: 0, email: 0, skipped: 0 });

  // Already-reminded pairs (a re-run must never double-notify).
  const { data: priorFeed } = await supabaseAdmin
    .from("ss_feed")
    .select("visit_id, kind")
    .like("kind", "reminder%")
    .in("visit_id", visits.map((v) => v.id));
  const alreadySent = new Set((priorFeed ?? []).map((f) => `${f.visit_id}|${f.kind}`));

  let sentSms = 0;
  let sentEmail = 0;
  let skipped = 0;

  for (const visit of visits) {
    const c = visit.ss_customers;
    if (!c || c.notify_visits === false) {
      skipped += 1;
      continue;
    }

    const offsets = schedules.get(c.service_level ?? "") ?? fallback;
    if (!offsets.length) {
      skipped += 1;
      continue;
    }

    const slot = windowFromNotes(visit.notes);
    const [y, m, d] = visit.scheduled_date.split("-").map(Number);
    const start = new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1, windowStartHour(slot), 0, 0);
    const leadHours = (start.getTime() - ct.getTime()) / 3600_000;

    // The cron runs hourly, so an offset is "due" in the hour leading up to it.
    const due = offsets.find((o) => leadHours <= o && leadHours > o - 1);
    if (due === undefined) continue;
    if (alreadySent.has(`${visit.id}|${feedKindFor(due)}`)) {
      skipped += 1;
      continue;
    }

    const when = prettyDate(visit.scheduled_date);
    const lead = leadLabel(due, when);
    const channel = (c.preferred_contact ?? "email").toLowerCase();
    const wantsText = channel === "sms" || channel === "phone";
    let via: "sms" | "email" | null = null;

    if (wantsText && c.phone) {
      const body =
        due < 12
          ? `Savvy Swim: your pool service is about ${due} hours out, arriving between ${slot} today. ` +
            `Please unlock the gate and keep pets inside. Questions? ${OFFICE_PHONE}.`
          : `Savvy Swim: your pool service is ${lead}, between ${slot}. ` +
            `Please unlock the gate and keep pets inside. Reschedule at savvyswim.com/portal or call ${OFFICE_PHONE}.`;
      if (await twilioSend(c.phone, body)) {
        via = "sms";
        sentSms += 1;
      }
    }

    if (!via && c.email) {
      if (await emailReminder(c.email, c, when, slot, visit.id, due)) {
        via = "email";
        sentEmail += 1;
      }
    }

    if (!via) {
      skipped += 1;
      continue;
    }

    await supabaseAdmin.from("ss_feed").insert({
      customer_id: c.id,
      visit_id: visit.id,
      kind: feedKindFor(due),
      title: `Reminder sent, visit ${lead}`,
      body: `Arrival window ${slot}. Sent by ${via === "sms" ? "text message" : "email"} based on your notification preferences.`,
      sent_by_sms: via === "sms",
    });
  }

  console.log(`[visit-reminders] ${from}→${to}: sms=${sentSms} email=${sentEmail} skipped=${skipped}`);
  return Response.json({ from, to, sms: sentSms, email: sentEmail, skipped });
}

export const Route = createFileRoute("/api/public/hooks/visit-reminders")({
  server: {
    handlers: {
      GET: ({ request }) => run(request),
      POST: ({ request }) => run(request),
    },
  },
});
