/**
 * Daily appointment reminders for customers.
 *
 * Runs once a day from pg_cron (5pm CT). It finds every service visit scheduled
 * for tomorrow and reminds the customer through the channel they picked in
 * /portal → Property profile:
 *
 *   notify_visits = false  → never remind (hard opt-out)
 *   preferred_contact sms  → text message (Twilio)
 *   preferred_contact phone→ text message (we can't robo-dial, so we text)
 *   preferred_contact email→ branded email
 *
 * Deduping: every reminder writes an ss_feed row (kind = 'reminder') tied to the
 * visit, and we skip any visit that already has one — so a re-run or a manual
 * trigger never double-texts a customer.
 *
 * Public route: takes no caller input that drives writes and returns no PII.
 */
import { createFileRoute } from "@tanstack/react-router";
import { sendLovableEmail } from "@lovable.dev/email-js";

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";
const SENDER_DOMAIN = "notify.savvyswim.com";
const FROM_EMAIL = "Savvy Swim <noreply@notify.savvyswim.com>";
const OFFICE_PHONE = "(469) 744-0379";

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

/** YYYY-MM-DD for "tomorrow" in America/Chicago. */
function tomorrowInCT(): string {
  const ct = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Chicago" }));
  ct.setDate(ct.getDate() + 1);
  const m = String(ct.getMonth() + 1).padStart(2, "0");
  const d = String(ct.getDate()).padStart(2, "0");
  return `${ct.getFullYear()}-${m}-${d}`;
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
  const match = /Preferred window:\s*([^—\n]+)/.exec(notes ?? "");
  return match?.[1]?.trim() || "8:00a – 4:00p";
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function twilioSend(to: string, body: string): Promise<boolean> {
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
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
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
): Promise<boolean> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return false;
  const first = customer.full_name?.split(" ")[0] ?? "there";
  const where = [customer.address, customer.city].filter(Boolean).join(", ");
  const text =
    `Hi ${first} — a quick reminder that your Savvy Swim visit is tomorrow, ${when}, ` +
    `arriving between ${slot}.${where ? ` We'll be at ${where}.` : ""}\n\n` +
    `Please leave the gate unlocked and pets inside. Need to move it? Reschedule anytime in your portal ` +
    `at https://savvyswim.com/portal or call ${OFFICE_PHONE}.`;

  try {
    await sendLovableEmail(
      {
        to,
        from: FROM_EMAIL,
        sender_domain: SENDER_DOMAIN,
        subject: `Your pool service is tomorrow — ${when}`,
        html: `<div style="font-family:Helvetica,Arial,sans-serif;color:#1c1c1c;max-width:560px">
  <p style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#8E1F2C;margin:0 0 12px">Savvy Swim · Visit reminder</p>
  <h1 style="font-size:22px;margin:0 0 12px">Hi ${esc(first)}, we're on the schedule for tomorrow.</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 8px"><strong>${esc(when)}</strong> · arriving between <strong>${esc(slot)}</strong></p>
  ${where ? `<p style="font-size:15px;line-height:1.6;margin:0 0 8px">${esc(where)}</p>` : ""}
  <p style="font-size:15px;line-height:1.6;margin:16px 0">Please leave the gate unlocked and pets inside so your tech can get straight to work.</p>
  <p style="font-size:15px;line-height:1.6;margin:16px 0">Need to move it? Reschedule anytime in your <a href="https://savvyswim.com/portal" style="color:#1FA9BE">customer portal</a> or call ${OFFICE_PHONE}.</p>
</div>`,
        text,
        purpose: "transactional",
        label: "visit-reminder",
        idempotency_key: `visit-reminder:${visitId}`,
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
  const target = new URL(request.url).searchParams.get("date") ?? tomorrowInCT();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(target)) {
    return Response.json({ error: "bad date" }, { status: 400 });
  }
  const when = prettyDate(target);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("ss_visits")
    .select(
      "id, customer_id, scheduled_date, notes, " +
        "ss_customers(id, full_name, email, phone, address, city, service_level, gate_code, notify_visits, preferred_contact)",
    )
    .eq("scheduled_date", target)
    .in("status", ["scheduled", "pending", "en_route"])
    .limit(500);

  if (error) {
    console.error("[visit-reminders] query failed", error.message);
    return Response.json({ error: "query failed" }, { status: 500 });
  }

  const visits = (data ?? []) as unknown as VisitRow[];
  if (!visits.length) return Response.json({ date: target, sent: 0, skipped: 0 });

  // Already-reminded visits (a re-run must never double-notify).
  const { data: priorFeed } = await supabaseAdmin
    .from("ss_feed")
    .select("visit_id")
    .eq("kind", "reminder")
    .in("visit_id", visits.map((v) => v.id));
  const alreadySent = new Set((priorFeed ?? []).map((f) => f.visit_id as string));

  let sentSms = 0;
  let sentEmail = 0;
  let skipped = 0;

  for (const visit of visits) {
    const c = visit.ss_customers;
    if (!c || alreadySent.has(visit.id) || c.notify_visits === false) {
      skipped += 1;
      continue;
    }

    const slot = windowFromNotes(visit.notes);
    const channel = (c.preferred_contact ?? "email").toLowerCase();
    const wantsText = channel === "sms" || channel === "phone";
    let via: "sms" | "email" | null = null;

    if (wantsText && c.phone) {
      const body =
        `Savvy Swim: your pool service is tomorrow, ${when}, between ${slot}. ` +
        `Please unlock the gate and keep pets inside. Reschedule at savvyswim.com/portal or call ${OFFICE_PHONE}.`;
      if (await twilioSend(c.phone, body)) {
        via = "sms";
        sentSms += 1;
      }
    }

    if (!via && c.email) {
      if (await emailReminder(c.email, c, when, slot, visit.id)) {
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
      kind: "reminder",
      title: `Reminder sent — visit tomorrow, ${when}`,
      body: `Arrival window ${slot}. Sent by ${via === "sms" ? "text message" : "email"} based on your notification preferences.`,
      sent_by_sms: via === "sms",
    });
  }

  console.log(`[visit-reminders] ${target}: sms=${sentSms} email=${sentEmail} skipped=${skipped}`);
  return Response.json({ date: target, sms: sentSms, email: sentEmail, skipped });
}

export const Route = createFileRoute("/api/public/hooks/visit-reminders")({
  server: {
    handlers: {
      GET: ({ request }) => run(request),
      POST: ({ request }) => run(request),
    },
  },
});
