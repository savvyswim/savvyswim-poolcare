/**
 * Customer-facing notifications for payment events pushed from the CRM
 * (savvyswim.app) into the website via
 * POST /api/public/hooks/crm-payment-status.
 *
 * Server-only module: nothing here may reach a client bundle.
 */
import { sendLovableEmail } from "@lovable.dev/email-js";

const SENDER_DOMAIN = "notify.savvyswimservices.com";
const FROM_EMAIL = "Savvy Swim <noreply@notify.savvyswimservices.com>";
const OFFICE_PHONE = "(817) 663-7665";
const PORTAL_URL = "https://savvyswim.app/portal";

export type PaymentStatus = "succeeded" | "failed" | "refunded" | "pending";

export type PaymentEvent = {
  eventId: string;
  invoiceNumber: string | null;
  status: PaymentStatus;
  amount: number | null;
  customerName: string | null;
  email: string | null;
  method: string | null;
  message: string | null;
};

export function normalizePaymentStatus(raw: unknown): PaymentStatus | null {
  if (typeof raw !== "string") return null;
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  const aliases: Record<string, PaymentStatus> = {
    paid: "succeeded",
    success: "succeeded",
    succeeded: "succeeded",
    captured: "succeeded",
    declined: "failed",
    failed: "failed",
    refund: "refunded",
    refunded: "refunded",
    processing: "pending",
    pending: "pending",
  };
  return aliases[key] ?? null;
}

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function money(amount: number | null): string {
  return amount === null ? "" : `$${amount.toFixed(2)}`;
}

export function paymentCopy(e: PaymentEvent): { subject: string; headline: string; body: string } {
  const who = e.customerName?.trim().split(/\s+/)[0] || "there";
  const inv = e.invoiceNumber ? ` for ${e.invoiceNumber}` : "";
  const amt = money(e.amount);
  switch (e.status) {
    case "succeeded":
      return {
        subject: `Payment received${e.invoiceNumber ? `, ${e.invoiceNumber}` : ""}`,
        headline: `Thanks ${who}, your payment went through.`,
        body: `We received ${amt ? `${amt} ` : "your payment "}${inv}${e.method ? ` via ${e.method}` : ""}. A receipt is in your portal.`,
      };
    case "failed":
      return {
        subject: `Payment didn't go through${e.invoiceNumber ? `, ${e.invoiceNumber}` : ""}`,
        headline: `Hi ${who}, your payment didn't go through.`,
        body: `The ${amt ? `${amt} ` : ""}payment${inv} was declined${e.method ? ` (${e.method})` : ""}. You can update your card and retry in the portal. No service interruption if it's handled this week.`,
      };
    case "refunded":
      return {
        subject: `Refund issued${e.invoiceNumber ? `, ${e.invoiceNumber}` : ""}`,
        headline: `Hi ${who}, your refund is on the way.`,
        body: `We refunded ${amt || "your payment"}${inv}. It typically lands in 3–5 business days.`,
      };
    default:
      return {
        subject: "Payment processing",
        headline: `Hi ${who}, we're processing your payment.`,
        body: `Your ${amt ? `${amt} ` : ""}payment${inv} is processing. We'll email a receipt as soon as it clears.`,
      };
  }
}

/** Only interrupt the customer for outcomes they need to act on or keep. */
export function shouldNotifyPayment(status: PaymentStatus): boolean {
  return status !== "pending";
}

export async function sendPaymentEmail(to: string, e: PaymentEvent): Promise<boolean> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return false;
  const { subject, headline, body } = paymentCopy(e);
  const text = `${headline}\n\n${body}${e.message ? `\n\nNote: ${e.message}` : ""}\n\nPortal: ${PORTAL_URL}\nCall: ${OFFICE_PHONE}\nSavvy Swim`;
  try {
    await sendLovableEmail(
      {
        to,
        from: FROM_EMAIL,
        sender_domain: SENDER_DOMAIN,
        reply_to: "hi@savvyswim.com",
        subject,
        html: `<div style="font-family:Helvetica,Arial,sans-serif;color:#1c1c1c;max-width:560px">
  <p style="font-size:13px;letter-spacing:.18em;text-transform:uppercase;color:#8E1F2C;margin:0 0 12px">Savvy Swim · Billing</p>
  <h1 style="font-size:22px;margin:0 0 12px">${esc(headline)}</h1>
  <p style="font-size:15px;line-height:1.6;margin:0 0 12px">${esc(body)}</p>
  ${e.message ? `<p style="font-size:15px;line-height:1.6;margin:0 0 12px;border-left:3px solid #1FA9BE;padding-left:12px">${esc(e.message)}</p>` : ""}
  <p style="font-size:15px;line-height:1.6;margin:16px 0">Manage invoices in your <a href="${PORTAL_URL}" style="color:#1FA9BE">customer portal</a>, or call ${OFFICE_PHONE}.</p>
</div>`,
        text,
        purpose: "transactional",
        label: `payment-${e.status}`,
        idempotency_key: `payment-status:${e.eventId}`,
      },
      { apiKey },
    );
    return true;
  } catch (error) {
    console.error("[payment-status] email failed", error instanceof Error ? error.message : error);
    return false;
  }
}
