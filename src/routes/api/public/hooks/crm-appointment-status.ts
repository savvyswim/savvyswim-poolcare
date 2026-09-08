/**
 * Inbound webhook: CRM (savvyservices.app) → website.
 *
 * The CRM POSTs here whenever an appointment status changes; we notify the
 * customer by email and/or SMS and keep an audit row in
 * public.ss_appointment_webhook_events.
 *
 * Security: the caller must prove it holds CRM_WEBHOOK_SECRET, either with
 *   X-Savvy-Signature: sha256=<hex hmac of the raw body>
 * or, for simpler integrations,
 *   Authorization: Bearer <secret>
 * Signature is preferred. Replays are ignored via the unique event id.
 *
 * Body (JSON):
 * {
 *   "event_id": "evt_123",              // required, unique per event
 *   "appointment_id": "visit_456",
 *   "status": "on_the_way",             // scheduled | rescheduled | on_the_way |
 *                                       // arrived | in_progress | completed |
 *                                       // no_access | canceled
 *   "previous_status": "scheduled",
 *   "customer": { "name": "...", "email": "...", "phone": "...", "id": "uuid" },
 *   "scheduled_date": "2026-08-12",
 *   "arrival_window": "10:00a – 12:00p",
 *   "technician": "Marcus",
 *   "message": "Running 20 minutes behind",
 *   "channels": ["email","sms"]         // optional override
 * }
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  normalizeStatus,
  shouldNotify,
  smsBody,
  sendStatusEmail,
  sendStatusSms,
  type AppointmentEvent,
} from "@/lib/appointment-status-notify.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Savvy-Signature",
  "Access-Control-Max-Age": "86400",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function authorized(request: Request, raw: string, secret: string): boolean {
  const sig = (request.headers.get("x-savvy-signature") ?? "").replace(/^sha256=/i, "").trim();
  if (sig) {
    const expected = createHmac("sha256", secret).update(raw).digest("hex");
    return safeEqual(sig.toLowerCase(), expected);
  }
  const bearer = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
  return bearer.length > 0 && safeEqual(bearer, secret);
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

async function recordRejection(status: number, reason: string) {
  try {
    const { logWebhookRejection } = await import("@/lib/webhook-log.server");
    await logWebhookRejection({
      channel: "appointment",
      endpoint: "/api/public/hooks/crm-appointment-status",
      status,
      reason,
    });
  } catch {
    /* best effort */
  }
}

async function handle(request: Request): Promise<Response> {
  const secret = process.env["CRM_WEBHOOK_SECRET"];
  if (!secret) {
    console.error("[crm-appointment-status] CRM_WEBHOOK_SECRET is not configured");
    return json({ error: "webhook not configured" }, 503);
  }

  const raw = await request.text();
  if (!authorized(request, raw, secret)) {
    await recordRejection(401, "invalid signature");
    return json({ error: "invalid signature" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    await recordRejection(400, "invalid json");
    return json({ error: "invalid json" }, 400);
  }

  const status = normalizeStatus(payload["status"]);
  if (!status) return json({ error: "unknown status" }, 400);

  const customer = (payload["customer"] ?? {}) as Record<string, unknown>;
  const appointmentId = str(payload["appointment_id"]) ?? str(payload["visit_id"]);
  const eventId = str(payload["event_id"]) ?? `${appointmentId ?? "appt"}:${status}:${Date.now()}`;

  const evt: AppointmentEvent = {
    eventId,
    appointmentId,
    status,
    previousStatus: str(payload["previous_status"]),
    customerName: str(customer["name"]) ?? str(payload["customer_name"]),
    email: (str(customer["email"]) ?? str(payload["email"]))?.toLowerCase() ?? null,
    phone: str(customer["phone"]) ?? str(payload["phone"]),
    scheduledDate: str(payload["scheduled_date"]),
    arrivalWindow: str(payload["arrival_window"]),
    technician: str(payload["technician"]),
    message: str(payload["message"]),
  };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Replay guard. The unique event id makes redelivery a no-op.
  const { data: existing } = await supabaseAdmin
    .from("ss_appointment_webhook_events")
    .select("id, notified_email, notified_sms")
    .eq("event_id", eventId)
    .maybeSingle();
  if (existing) {
    return json({ ok: true, duplicate: true, notified: { email: existing.notified_email, sms: existing.notified_sms } });
  }

  // Match the customer on file so we honour their contact preferences.
  let customerId = str(customer["id"]);
  let notifyVisits = true;
  let preferred: string | null = null;
  const orFilters = [
    evt.email ? `email.eq.${evt.email}` : null,
    evt.phone ? `phone.eq.${evt.phone}` : null,
  ].filter(Boolean) as string[];
  if (customerId || orFilters.length) {
    const query = supabaseAdmin
      .from("ss_customers")
      .select("id, full_name, email, phone, notify_visits, preferred_contact")
      .limit(1);
    const { data: match } = customerId
      ? await query.eq("id", customerId).maybeSingle()
      : await query.or(orFilters.join(",")).maybeSingle();
    if (match) {
      customerId = match.id;
      notifyVisits = match.notify_visits !== false;
      preferred = match.preferred_contact ?? null;
      evt.customerName = evt.customerName ?? match.full_name ?? null;
      evt.email = evt.email ?? match.email ?? null;
      evt.phone = evt.phone ?? match.phone ?? null;
    }
  }

  const requested = Array.isArray(payload["channels"])
    ? (payload["channels"] as unknown[]).map((c) => String(c).toLowerCase())
    : null;
  const wantEmail = requested ? requested.includes("email") : preferred !== "sms" && preferred !== "phone";
  const wantSms = requested ? requested.includes("sms") : preferred === "sms" || preferred === "phone";

  let notifiedEmail = false;
  let notifiedSms = false;
  let error: string | null = null;

  if (!notifyVisits) {
    error = "customer opted out of visit notifications";
  } else if (!shouldNotify(status)) {
    error = "status is informational only";
  } else {
    try {
      if (wantEmail && evt.email) notifiedEmail = await sendStatusEmail(evt.email, evt);
      if (wantSms && evt.phone) notifiedSms = await sendStatusSms(evt.phone, smsBody(evt));
      // Fall back to whatever channel we do have contact details for.
      if (!notifiedEmail && !notifiedSms && evt.email && !wantEmail) {
        notifiedEmail = await sendStatusEmail(evt.email, evt);
      }
      if (!notifiedEmail && !notifiedSms) error = error ?? "no channel delivered";
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error("[crm-appointment-status] delivery failed", error);
    }
  }

  await supabaseAdmin.from("ss_appointment_webhook_events").insert({
    event_id: eventId,
    appointment_id: appointmentId,
    customer_id: customerId,
    customer_email: evt.email,
    customer_phone: evt.phone,
    status,
    previous_status: evt.previousStatus,
    scheduled_date: evt.scheduledDate,
    arrival_window: evt.arrivalWindow,
    technician: evt.technician,
    message: evt.message,
    notified_email: notifiedEmail,
    notified_sms: notifiedSms,
    error,
    payload: payload as never,
  });

  const { logWebhookDelivery } = await import("@/lib/webhook-log.server");
  await logWebhookDelivery({
    channel: "appointment",
    direction: "inbound",
    eventKey: eventId,
    endpoint: "/api/public/hooks/crm-appointment-status",
    reference: `${evt.customerName ?? evt.email ?? appointmentId ?? "appointment"} · ${status.replace(/_/g, " ")}`,
    outcome: notifiedEmail || notifiedSms ? "success" : error ? "failed" : "skipped",
    httpStatus: 200,
    error,
    request: payload,
    response: JSON.stringify({ email: notifiedEmail, sms: notifiedSms }),
  });

  return json({ ok: true, event_id: eventId, notified: { email: notifiedEmail, sms: notifiedSms }, error });
}

export const Route = createFileRoute("/api/public/hooks/crm-appointment-status")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          return await handle(request);
        } catch (err) {
          console.error("[crm-appointment-status] unhandled", err instanceof Error ? err.message : err);
          return json({ error: "internal error" }, 500);
        }
      },
    },
  },
});
