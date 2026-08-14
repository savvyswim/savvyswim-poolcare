import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const money = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n || 0));

/**
 * Emails (and texts) a payment receipt to the signed-in customer for an invoice
 * they just paid from /portal. RLS + an explicit ownership check keep this
 * scoped to the caller's own invoices.
 */
export const sendPortalReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        invoiceId: z.string().uuid(),
        method: z.string().max(40).optional(),
        reference: z.string().max(120).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: customerId, error: meError } = await supabase.rpc("ss_my_customer_id");
    if (meError) throw new Error(meError.message);
    if (!customerId) throw new Error("No customer account is linked to this login");

    const { data: invoice, error } = await supabase
      .from("ss_invoices")
      .select("id, invoice_number, amount, status, paid_at, customer_id")
      .eq("id", data.invoiceId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invoice || invoice.customer_id !== customerId) throw new Error("Invoice not found");

    const { data: customer } = await supabase
      .from("ss_customers")
      .select("full_name, email, phone")
      .eq("id", customerId)
      .maybeSingle();

    const firstName = (customer?.full_name ?? "there").split(" ")[0];
    const paidOn = new Date(invoice.paid_at ?? Date.now()).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "America/Chicago",
    });
    const methodLabel =
      data.method === "ach" ? "Bank transfer (ACH)" : data.method === "phone" ? "Pay by phone" : "Card";
    const amount = money(Number(invoice.amount));

    const channels: string[] = [];
    const apiKey = process.env["LOVABLE_API_KEY"];

    if (customer?.email && apiKey) {
      const html = `
<div style="background:#F4EFE3;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#2b2320;">
  <div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e5dcc9;overflow:hidden;">
    <div style="background:#8E1F2C;color:#F4EFE3;padding:20px 28px;">
      <div style="font-size:20px;font-weight:800;letter-spacing:.08em;">SAVVY SWIM</div>
      <div style="font-size:11px;letter-spacing:.14em;opacity:.85;margin-top:2px;">PAYMENT RECEIPT</div>
    </div>
    <div style="padding:28px;">
      <p style="margin:0 0 12px;font-size:15px;">Hi ${firstName},</p>
      <p style="margin:0 0 18px;font-size:14px;line-height:1.6;">
        Thanks — we received your payment. Here's your receipt for invoice
        <strong>${invoice.invoice_number}</strong>.
      </p>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:8px 0;color:#7a6f63;">Amount paid</td><td style="padding:8px 0;text-align:right;font-weight:700;">${amount}</td></tr>
        <tr><td style="padding:8px 0;color:#7a6f63;">Method</td><td style="padding:8px 0;text-align:right;">${methodLabel}</td></tr>
        <tr><td style="padding:8px 0;color:#7a6f63;">Date</td><td style="padding:8px 0;text-align:right;">${paidOn}</td></tr>
        ${data.reference ? `<tr><td style="padding:8px 0;color:#7a6f63;">Reference</td><td style="padding:8px 0;text-align:right;">${data.reference}</td></tr>` : ""}
      </table>
      <p style="margin:20px 0 0;font-size:12px;color:#7a6f63;line-height:1.6;">
        Questions about this receipt? Call or text us at (469) 744-0379.
      </p>
    </div>
    <div style="border-top:1px solid #e5dcc9;padding:14px 28px;font-size:11px;color:#9a8f82;">
      Savvy Swim · Dallas–Fort Worth · savvyswim.com
    </div>
  </div>
</div>`;

      const text = `Hi ${firstName},

We received your payment of ${amount} for invoice ${invoice.invoice_number}.
Method: ${methodLabel}
Date: ${paidOn}${data.reference ? `\nReference: ${data.reference}` : ""}

Questions? Call or text (469) 744-0379.
Savvy Swim · savvyswim.com`;

      try {
        const { sendLovableEmail } = await import("@lovable.dev/email-js");
        await sendLovableEmail(
          {
            to: customer.email,
            from: "Savvy Swim <noreply@notify.savvyswimservices.com>",
            sender_domain: "notify.savvyswimservices.com",
            reply_to: "hi@savvyswim.com",
            subject: `Receipt for ${invoice.invoice_number} — ${amount}`,
            html,
            text,
            label: "portal-payment-receipt",
            idempotency_key: `portal-receipt-${invoice.id}`,
          },
          { apiKey },
        );
        channels.push("email");
      } catch (e) {
        console.error("Receipt email failed:", e);
      }
    }

    const twilioKey = process.env["TWILIO_API_KEY"];
    if (customer?.phone && apiKey && twilioKey) {
      try {
        const { normalizePhone } = await import("./phone");
        const to = normalizePhone(customer.phone);
        if (to) {
          const gwHeaders = {
            Authorization: `Bearer ${apiKey}`,
            "X-Connection-Api-Key": twilioKey,
          };
          const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";
          const numbersRes = await fetch(`${GATEWAY_URL}/IncomingPhoneNumbers.json?PageSize=1`, {
            headers: gwHeaders,
          });
          if (!numbersRes.ok) {
            console.error(`Twilio numbers lookup failed [${numbersRes.status}]: ${await numbersRes.text()}`);
          } else {
            const numbers = (await numbersRes.json()) as {
              incoming_phone_numbers?: { phone_number?: string }[];
            };
            const from = numbers.incoming_phone_numbers?.[0]?.phone_number;
            if (from) {
              const sendRes = await fetch(`${GATEWAY_URL}/Messages.json`, {
                method: "POST",
                headers: { ...gwHeaders, "Content-Type": "application/x-www-form-urlencoded" },
                body: new URLSearchParams({
                  To: to,
                  From: from,
                  Body: `Savvy Swim receipt: ${amount} paid on invoice ${invoice.invoice_number} (${methodLabel}, ${paidOn}). Thank you!`,
                }),
              });
              if (!sendRes.ok) {
                console.error(`Twilio send failed [${sendRes.status}]: ${await sendRes.text()}`);
              } else {
                channels.push("sms");
              }
            }
          }
        }
      } catch (e) {
        console.error("Receipt SMS failed:", e);
      }
    }

    return { channels, amount, invoiceNumber: invoice.invoice_number };
  });
