/**
 * Inbound webhook: CRM (savvyswim.app) → website.
 *
 * The CRM POSTs here when an invoice payment succeeds, fails or is refunded.
 * We email the customer and record the delivery for the admin webhook-health
 * dashboard.
 *
 * Security: the caller must prove it holds CRM_WEBHOOK_SECRET, either with
 *   X-Savvy-Signature: sha256=<hex hmac of the raw body>
 * or Authorization: Bearer <secret>. Replays are ignored via the event id.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  normalizePaymentStatus,
  sendPaymentEmail,
  shouldNotifyPayment,
  type PaymentEvent,
} from "@/lib/payment-status-notify.server";

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
      channel: "payment",
      endpoint: "/api/public/hooks/crm-payment-status",
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
    console.error("[crm-payment-status] CRM_WEBHOOK_SECRET is not configured");
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

  const status = normalizePaymentStatus(payload["status"]);
  if (!status) return json({ error: "unknown status" }, 400);

  const customer = (payload["customer"] ?? {}) as Record<string, unknown>;
  const invoiceNumber = str(payload["invoice_number"]) ?? str(payload["invoice"]);
  const rawAmount = payload["amount"];
  const amount =
    typeof rawAmount === "number" ? rawAmount : rawAmount ? Number(rawAmount) || null : null;

  const evt: PaymentEvent = {
    eventId: str(payload["event_id"]) ?? `${invoiceNumber ?? "pay"}:${status}:${Date.now()}`,
    invoiceNumber,
    status,
    amount,
    customerName: str(customer["name"]) ?? str(payload["customer_name"]),
    email: (str(customer["email"]) ?? str(payload["email"]))?.toLowerCase() ?? null,
    method: str(payload["method"]),
    message: str(payload["message"]),
  };

  const { logWebhookDelivery } = await import("@/lib/webhook-log.server");

  let notified = false;
  let error: string | null = null;

  if (!shouldNotifyPayment(status)) {
    error = "status is informational only";
  } else if (!evt.email) {
    error = "no email on the payload";
  } else {
    try {
      notified = await sendPaymentEmail(evt.email, evt);
      if (!notified) error = "email delivery failed";
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
      console.error("[crm-payment-status] delivery failed", error);
    }
  }

  await logWebhookDelivery({
    channel: "payment",
    direction: "inbound",
    eventKey: evt.eventId,
    endpoint: "/api/public/hooks/crm-payment-status",
    reference: `${evt.customerName ?? evt.email ?? invoiceNumber ?? "payment"} · ${status}`,
    outcome: notified ? "success" : error === "status is informational only" ? "skipped" : "failed",
    httpStatus: 200,
    error,
    request: payload,
    response: JSON.stringify({ email: notified }),
  });

  return json({ ok: true, event_id: evt.eventId, notified: { email: notified }, error });
}

export const Route = createFileRoute("/api/public/hooks/crm-payment-status")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          return await handle(request);
        } catch (err) {
          console.error("[crm-payment-status] unhandled", err instanceof Error ? err.message : err);
          return json({ error: "internal error" }, 500);
        }
      },
    },
  },
});
