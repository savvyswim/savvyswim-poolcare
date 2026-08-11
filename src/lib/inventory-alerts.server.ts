/**
 * Low-stock / reorder notification helpers.
 *
 * Kept out of the *.functions.ts wrapper so server-fn splitting never strips
 * these runtime helpers. Used by both the CRM-triggered check and the daily
 * sweep at /api/public/hooks/low-stock-watch.
 */
import { sendLovableEmail } from "@lovable.dev/email-js";

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";
const DEFAULT_EMAIL = "marcus@santanariveragroup.com";
const DEFAULT_PHONE = "+14697440379";

export type LowItem = {
  id: string;
  name: string;
  unit: string | null;
  quantity: number;
  low_threshold: number;
};

export const alertTitle = (name: string) => `Low stock — ${name}`;

export function lineFor(i: LowItem): string {
  const unit = i.unit ?? "units";
  const state = i.quantity <= 0 ? "OUT OF STOCK" : `${i.quantity} ${unit} left`;
  return `${i.name}: ${state} (reorder at ${i.low_threshold} ${unit})`;
}

export function smsBody(items: LowItem[]): string {
  const head =
    items.length === 1
      ? `Savvy Swim inventory: ${lineFor(items[0]!)}`
      : `Savvy Swim inventory: ${items.length} items at or below reorder point.`;
  const rest = items.length === 1 ? "" : `\n${items.map((i) => `• ${lineFor(i)}`).join("\n")}`;
  return `${head}${rest}\nReorder: savvyswim.com/crm/inventory`.slice(0, 600);
}

export function emailParts(items: LowItem[]): { subject: string; html: string; text: string } {
  const subject =
    items.length === 1
      ? `Reorder needed — ${items[0]!.name}`
      : `Reorder needed — ${items.length} inventory items`;
  const rowsHtml = items
    .map(
      (i) => `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5dcc9;font-size:14px;">${esc(i.name)}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5dcc9;font-size:14px;font-weight:700;color:${i.quantity <= 0 ? "#8E1F2C" : "#2b2320"};">${i.quantity} ${esc(i.unit ?? "units")}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5dcc9;font-size:14px;color:#7a6f63;">reorder at ${i.low_threshold}</td>
      </tr>`,
    )
    .join("");
  const html = `
<div style="background:#F4EFE3;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#2b2320;">
  <div style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #e5dcc9;">
    <div style="background:#8E1F2C;color:#F4EFE3;padding:20px 28px;">
      <div style="font-size:20px;font-weight:800;letter-spacing:.08em;">SAVVY SWIM</div>
      <div style="font-size:11px;letter-spacing:.14em;opacity:.85;margin-top:2px;">INVENTORY — REORDER POINT</div>
    </div>
    <div style="padding:24px 28px;">
      <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">
        These items are at or below their reorder point:
      </p>
      <table style="width:100%;border-collapse:collapse;">${rowsHtml}</table>
      <p style="margin:20px 0 0;font-size:12px;color:#7a6f63;">
        Update counts in the <a href="https://savvyswimservices.com/crm/inventory" style="color:#1FA9BE;">CRM inventory board</a>.
      </p>
    </div>
  </div>
</div>`;
  const text = `${subject}\n\n${items.map((i) => `- ${lineFor(i)}`).join("\n")}\n\nsavvyswim.com/crm/inventory`;
  return { subject, html, text };
}

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function emailOps(items: LowItem[]): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return "no LOVABLE_API_KEY";
  const to = process.env["OPS_ALERT_EMAIL"] ?? DEFAULT_EMAIL;
  const { subject, html, text } = emailParts(items);
  try {
    await sendLovableEmail(
      {
        to,
        from: "Savvy Swim Ops <noreply@notify.savvyswim.com>",
        sender_domain: "notify.savvyswim.com",
        subject,
        html,
        text,
        purpose: "transactional",
        label: "inventory-low-stock",
        idempotency_key: crypto.randomUUID(),
      },
      { apiKey },
    );
    return `emailed ${to}`;
  } catch (error) {
    return `email failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

export async function smsOps(items: LowItem[]): Promise<string> {
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
      body: new URLSearchParams({ To: to, From: from, Body: smsBody(items) }),
    });
    if (!sendRes.ok) return `twilio send ${sendRes.status}`;
    return `texted ${to}`;
  } catch (error) {
    return `sms failed: ${error instanceof Error ? error.message : String(error)}`;
  }
}

/**
 * One shared pipeline: filter to items still below their reorder point, drop the
 * ones already alerted inside the cooldown, write an ss_alerts row per item, and
 * notify ops once with the batch.
 */
export async function dispatchLowStock(
  items: LowItem[],
  cooldownHours = 24,
): Promise<{ notified: string[]; skipped: number; channels: string[] }> {
  const low = items.filter((i) => i.quantity <= i.low_threshold);
  if (!low.length) return { notified: [], skipped: 0, channels: [] };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since = new Date(Date.now() - cooldownHours * 3600_000).toISOString();
  const titles = low.map((i) => alertTitle(i.name));
  const { data: recent } = await supabaseAdmin
    .from("ss_alerts")
    .select("title")
    .in("title", titles)
    .gte("created_at", since);
  const muted = new Set((recent ?? []).map((r) => r.title));

  const fresh = low.filter((i) => !muted.has(alertTitle(i.name)));
  if (!fresh.length) return { notified: [], skipped: low.length, channels: [] };

  await supabaseAdmin.from("ss_alerts").insert(
    fresh.map((i) => ({
      title: alertTitle(i.name),
      body: lineFor(i),
      priority: i.quantity <= 0 ? "high" : "normal",
    })),
  );

  const channels = [await emailOps(fresh), await smsOps(fresh)];
  return { notified: fresh.map((i) => i.name), skipped: low.length - fresh.length, channels };
}
