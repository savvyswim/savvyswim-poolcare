/**
 * Customer-facing notifications for appointment status changes pushed from the
 * CRM (savvyservices.app) into the website via
 * POST /api/public/hooks/crm-appointment-status.
 *
 * Kept in a *.server.ts module so none of it can ever reach a client bundle.
 */
import { sendLovableEmail } from "@lovable.dev/email-js";

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";
const SENDER_DOMAIN = "notify.savvyswimservices.com";
const FROM_EMAIL = "Savvy Swim <noreply@notify.savvyswimservices.com>";
const OFFICE_PHONE = "(469) 744-0379";
const PORTAL_URL = "https://savvyswimservices.com/portal";

export type AppointmentStatus =
  | "scheduled"
  | "rescheduled"
  | "on_the_way"
  | "arrived"
  | "in_progress"
  | "completed"
  | "no_access"
  | "canceled";

export type AppointmentEvent = {
  eventId: string;
  appointmentId: string | null;
  status: AppointmentStatus;
  previousStatus: string | null;
  customerName: string | null;
  email: string | null;
  phone: string | null;
  scheduledDate: string | null;
  arrivalWindow: string | null;
  technician: string | null;
  message: string | null;
};

export const APPOINTMENT_STATUSES: AppointmentStatus[] = [
  "scheduled",
  "rescheduled",
  "on_the_way",
  "arrived",
  "in_progress",
  "completed",
  "no_access",
  "canceled",
];

/** Statuses that are worth interrupting a customer for. */
const NOTIFIABLE = new Set<AppointmentStatus>([
  "scheduled",
  "rescheduled",
  "on_the_way",
  "arrived",
  "completed",
  "no_access",
  "canceled",
]);

export function shouldNotify(status: AppointmentStatus): boolean {
  return NOTIFIABLE.has(status);
}

export function normalizeStatus(raw: unknown): AppointmentStatus | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, AppointmentStatus> = {
    booked: "scheduled",
    confirmed: "scheduled",
    moved: "rescheduled",
    enroute: "on_the_way",
    en_route: "on_the_way",
    on_route: "on_the_way",
    onsite: "arrived",
    on_site: "arrived",
    started: "in_progress",
    working: "in_progress",
    done: "completed",
    complete: "completed",
    finished: "completed",
    locked_out: "no_access",
    lockout: "no_access",
    cancelled: "canceled",
  };
  if (aliases[key]) return aliases[key] as AppointmentStatus;
  return (APPOINTMENT_STATUSES as string[]).includes(key) ? (key as AppointmentStatus) : null;
}

export function prettyDate(iso: string | null): string | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1)).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function esc(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function firstName(full: string | null): string {
  return full?.trim().split(/\s+/)[0] || "there";
}

export function copyFor(e: AppointmentEvent): { subject: string; headline: string; body: string } {
  const who = firstName(e.customerName);
  const when = prettyDate(e.scheduledDate);
  const slot = e.arrivalWindow ? ` between ${e.arrivalWindow}` : "";
  const tech = e.technician ? ` ${e.technician}` : " your tech";
  switch (e.status) {
    case "scheduled":
      return {
        subject: when ? `Visit confirmed — ${when}` : "Your pool visit is confirmed",
        headline: `Hi ${who}, you're on the schedule.`,
        body: `Your Savvy Swim visit is set${when ? ` for ${when}` : ""}${slot}. Please leave the gate unlocked and pets inside.`,
      };
    case "rescheduled":
      return {
        subject: when ? `Visit moved — now ${when}` : "Your pool visit moved",
        headline: `Hi ${who}, your visit moved.`,
        body: `Your Savvy Swim visit is now${when ? ` ${when}` : " rescheduled"}${slot}.`,
      };
    case "on_the_way":
      return {
        subject: "Your tech is on the way",
        headline: `Hi ${who},${tech} is on the way.`,
        body: `${e.technician ?? "Your tech"} is headed to your pool now${slot ? `, arriving${slot}` : ""}. Please unlock the gate and secure pets.`,
      };
    case "arrived":
      return {
        subject: "Your tech has arrived",
        headline: `Hi ${who},${tech} just arrived.`,
        body: `${e.technician ?? "Your tech"} is on site and starting service now.`,
      };
    case "completed":
      return {
        subject: "Pool service complete",
        headline: `Hi ${who}, your pool service is done.`,
        body: `${e.technician ?? "Your tech"} finished the visit${when ? ` on ${when}` : ""}. Your full water report and photos are in your customer portal.`,
      };
    case "no_access":
      return {
        subject: "We couldn't get to your pool",
        headline: `Hi ${who}, we couldn't access the pool.`,
        body: `${e.technician ?? "Your tech"} came out${when ? ` on ${when}` : ""} but couldn't get in — usually a locked gate or a dog in the yard. Reply or call us and we'll get you back on the route.`,
      };
    case "canceled":
      return {
        subject: when ? `Visit canceled — ${when}` : "Your pool visit was canceled",
        headline: `Hi ${who}, your visit was canceled.`,
        body: `Your Savvy Swim visit${when ? ` on ${when}` : ""} has been canceled. Rebook anytime in your portal.`,
      };
    default:
      return {
        subject: "Service update",
        headline: `Hi ${who}, quick service update.`,
        body: `Your Savvy Swim visit status changed to ${e.status.replace(/_/g, " ")}.`,
      };
  }
}

export function smsBody(e: AppointmentEvent): string {
  const { body } = copyFor(e);
  const note = e.message ? ` ${e.message.replace(/\s+/g, " ").slice(0, 120)}` : "";
  return `Savvy Swim: ${body}${note} ${PORTAL_URL} or ${OFFICE_PHONE}`.slice(0, 320);
}

export async function sendStatusSms(to: string, body: string): Promise<boolean> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  const twilioKey = process.env["TWILIO_API_KEY"];
  if (!apiKey || !twilioKey) return false;
  const headers = { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": twilioKey };
  try {
    const numbersRes = await fetch(`${TWILIO_GATEWAY}/IncomingPhoneNumbers.json?PageSize=1`, { headers });
    if (!numbersRes.ok) return false;
    const numbers = (await numbersRes.json()) as { incoming_phone_numbers?: { phone_number?: string }[] };
    const from = numbers.incoming_phone_numbers?.[0]?.phone_number;
    if (!from) return false;
    const res = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    });
    if (!res.ok) console.error(`[appt-status] twilio [${res.status}]: ${await res.text()}`);
    return res.ok;
  } catch (error) {
    console.error("[appt-status] sms failed", error instanceof Error ? error.message : error);
    return false;
  }
}

export async function sendStatusEmail(to: string, e: AppointmentEvent): Promise<boolean> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return false;
  const { subject, headline, body } = copyFor(e);
  const when = prettyDate(e.scheduledDate);
  const detail = [when, e.arrivalWindow ? `arriving ${e.arrivalWindow}` : null, e.technician]
    .filter(Boolean)
    .join(" · ");
  const text = `${headline}\n\n${body}${e.message ? `\n\nNote: ${e.message}` : ""}\n\n${detail}\n\nPortal: ${PORTAL_URL}\nCall: ${OFFICE_PHONE}\nSavvy Swim`;
  try {
    await sendLovableEmail(
      {
        to,
        from: FROM_EMAIL,
        sender_domain: SENDER_DOMAIN,
        reply_to: "hi@savvyswim.com",
        subject,
        html: `<div style="font-family:Helvetica,Arial,sans-serif;color:#1c1c1c;max-width:560px">
  <p style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#8E1F2C;margin:0 0 12px">Savvy Swim · Service update</p>
  <h1 style="font-size:22px;margin:0 0 12px">${esc(headline)}</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 12px">${esc(body)}</p>
  ${detail ? `<p style="font-size:14px;line-height:1.6;margin:0 0 12px;color:#5b5b5b">${esc(detail)}</p>` : ""}
  ${e.message ? `<p style="font-size:15px;line-height:1.6;margin:0 0 12px;border-left:3px solid #1FA9BE;padding-left:12px">${esc(e.message)}</p>` : ""}
  <p style="font-size:15px;line-height:1.6;margin:16px 0">See photos, water chemistry and invoices in your <a href="${PORTAL_URL}" style="color:#1FA9BE">customer portal</a>, or call ${OFFICE_PHONE}.</p>
</div>`,
        text,
        purpose: "transactional",
        label: `appointment-${e.status}`,
        idempotency_key: `appt-status:${e.eventId}`,
      },
      { apiKey },
    );
    return true;
  } catch (error) {
    console.error("[appt-status] email failed", error instanceof Error ? error.message : error);
    return false;
  }
}
