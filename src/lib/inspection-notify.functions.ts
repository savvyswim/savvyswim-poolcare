import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { FROM_ADDRESS, REPLY_TO_ADDRESS, SENDER_DOMAIN } from "@/lib/email-config";

const FALLBACK_OFFICE = "marcus@santanariveragroup.com";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "medium",
    timeStyle: "short",
  }) + " CT";

/**
 * Emails the office (and the homeowner) when a free-inspection request comes in.
 * Public on purpose — it accepts only a request id and reads every detail from
 * the database, so nothing a visitor types can be pushed into staff inboxes.
 */
export const notifyInspectionRequest = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ requestId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) return { sent: false as const, reason: "email_not_configured" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error } = await supabaseAdmin
      .from("inspection_requests")
      .select(
        "id, reference_number, full_name, email, phone, address, postal_code, preferred_date, preferred_contact_time, pool_details, notes, created_at, utm_source, utm_campaign, page_path",
      )
      .eq("id", data.requestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!req) throw new Error("Request not found");

    // Office recipients: configured list, else active owners/managers, else fallback.
    const emails: string[] = [];
    const { data: setting } = await supabaseAdmin
      .from("ss_settings")
      .select("value")
      .eq("key", "office_notification_emails")
      .maybeSingle();
    const raw = setting?.value as unknown;
    if (Array.isArray(raw)) for (const v of raw) if (typeof v === "string") emails.push(v);
    if (emails.length === 0) {
      const { data: staff } = await supabaseAdmin
        .from("ss_staff")
        .select("email, level, is_active")
        .eq("is_active", true)
        .in("level", ["owner", "office_manager"]);
      for (const s of staff ?? []) if (s.email) emails.push(s.email);
    }
    const recipients = [
      ...new Set(
        emails.map((e) => e.trim().toLowerCase()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)),
      ),
    ];
    if (recipients.length === 0) recipients.push(FALLBACK_OFFICE);

    const rows: [string, string][] = [
      ["Reference", req.reference_number],
      ["Name", req.full_name],
      ["Phone", req.phone],
      ["Email", req.email],
      ["Address", `${req.address}, ${req.postal_code}`],
      ["Preferred date", req.preferred_date ?? "—"],
      ["Best time", req.preferred_contact_time ?? "—"],
      ["Pool details", req.pool_details ?? "—"],
      ["Notes", req.notes ?? "—"],
      ["Submitted", fmt(req.created_at)],
      ["Source", [req.utm_source, req.utm_campaign, req.page_path].filter(Boolean).join(" · ") || "Direct"],
    ];

    const officeHtml = `<div style="font-family:Arial,Helvetica,sans-serif;color:#2b2b2b;">
  <h2 style="color:#8E1F2C;margin:0 0 12px;">New free inspection request</h2>
  <table style="border-collapse:collapse;font-size:14px;">
    ${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 14px 4px 0;color:#7a6f63;">${k}</td><td style="padding:4px 0;"><strong>${v}</strong></td></tr>`,
      )
      .join("")}
  </table>
  <p style="font-size:12px;color:#7a6f63;margin-top:18px;">Savvy Swim CRM → Inspection Requests</p>
</div>`;
    const officeText = rows.map(([k, v]) => `${k}: ${v}`).join("\n");

    const { sendLovableEmail } = await import("@lovable.dev/email-js");
    const results: Record<string, string> = {};

    for (const to of recipients) {
      try {
        await sendLovableEmail(
          {
            to,
            from: FROM_ADDRESS,
            sender_domain: SENDER_DOMAIN,
            reply_to: req.email,
            subject: `New inspection request — ${req.full_name} (${req.reference_number})`,
            html: officeHtml,
            text: officeText,
            label: "inspection-office-alert",
            idempotency_key: `inspection-office-${req.id}-${to}`,
          },
          { apiKey },
        );
        results[to] = "sent";
      } catch (e) {
        console.error("inspection office alert failed", e);
        results[to] = "failed";
      }
    }

    // Homeowner confirmation.
    const firstName = req.full_name.split(" ")[0];
    try {
      await sendLovableEmail(
        {
          to: req.email,
          from: FROM_ADDRESS,
          sender_domain: SENDER_DOMAIN,
          reply_to: REPLY_TO_ADDRESS,
          subject: `We got your inspection request (${req.reference_number})`,
          html: `<div style="background:#F4EFE3;padding:24px 0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E4DCCB;padding:32px 28px;">
    <p style="font-size:11px;letter-spacing:0.18em;color:#8E1F2C;margin:0 0 12px;">SAVVY SWIM · POOL CARE</p>
    <h2 style="font-size:26px;line-height:1.15;color:#12232E;margin:0 0 18px;">Thanks, ${firstName} — your free inspection is booked in.</h2>
    <p style="font-size:14px;color:#41474D;line-height:1.6;margin:0 0 18px;">We have your pool at <strong>${req.address}</strong>. A tech reviews it within one business day and sends two visit windows to choose from.</p>
    <div style="background:#F4EFE3;border-left:3px solid #1FA9BE;padding:18px 20px;margin:0 0 22px;">
      <p style="font-size:14px;color:#12232E;line-height:1.5;margin:0;">Reference <strong>${req.reference_number}</strong>${
        req.preferred_date ? `<br />Requested date <strong>${req.preferred_date}</strong>` : ""
      }</p>
    </div>
    <p style="font-size:14px;color:#41474D;line-height:1.6;margin:0 0 18px;">Need us sooner? Call or text <a href="tel:+18176637665" style="color:#8E1F2C;">817-663-POOL</a>, or just reply to this email.</p>
    <hr style="border:none;border-top:1px solid #E4DCCB;margin:24px 0 16px;" />
    <p style="font-size:12px;color:#6C7278;line-height:1.5;margin:0;">Savvy Swim · Dallas–Fort Worth · savvyswim.com</p>
  </div>
</div>`,
          text: `Thanks, ${firstName}. Your free pool inspection request (${req.reference_number}) for ${req.address} is in. A tech reviews it within one business day and sends two visit windows. Call or text 817-663-POOL (817-663-7665).`,

          label: "inspection-confirmation",
          idempotency_key: `inspection-confirm-${req.id}`,
        },
        { apiKey },
      );
      results[req.email] = "sent";
    } catch (e) {
      console.error("inspection confirmation failed", e);
      results[req.email] = "failed";
    }

    const { logInspectionEvents } = await import("./inspection-events.server");
    await logInspectionEvents(req.id, [
      { eventType: "status_change", statusTo: "new", detail: "Request submitted" },
      ...Object.entries(results).map(([to, outcome]) => ({
        eventType: (outcome === "sent" ? "email_sent" : "email_failed") as
          | "email_sent"
          | "email_failed",
        channel: "email",
        recipient: to,
        outcome,
        detail: to === req.email ? "Homeowner confirmation" : "Office new-request alert",
      })),
    ]);

    return { sent: true as const, recipients: results };
  });
