import { FROM_ADDRESS, REPLY_TO_ADDRESS, SENDER_DOMAIN } from "@/lib/email-config";

/**
 * Server-only implementation of the inspection / booking notification emails:
 * an office alert with every field, plus a branded homeowner confirmation.
 * Reads all details from the database by id, so nothing a visitor types can be
 * pushed straight into staff inboxes.
 */

const FALLBACK_OFFICE = "marcus@santanariveragroup.com";

const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Chicago",
    dateStyle: "medium",
    timeStyle: "short",
  }) + " CT";

/** Escape anything visitor-supplied before it lands in an HTML email body. */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type InspectionNotifyResult =
  | { sent: false; reason: string }
  | {
      sent: true;
      recipients: Record<string, string>;
      sms?: { to: string | null; outcome: "sent" | "failed" | "skipped" };
    };

export async function sendInspectionNotifications(
  requestId: string,
): Promise<InspectionNotifyResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { sent: false, reason: "email_not_configured" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: req, error } = await supabaseAdmin
    .from("inspection_requests")
    .select(
      "id, reference_number, full_name, email, phone, address, postal_code, preferred_date, preferred_contact_time, pool_details, notes, created_at, utm_source, utm_campaign, page_path, lead_type, source",
    )
    .eq("id", requestId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!req) throw new Error("Request not found");

  const isWaterTest = (req.lead_type ?? "") === "water_test";
  const kind = isWaterTest ? "water test" : "free inspection";
  // Where the form lived, so the office can triage city pages at a glance.
  const originLabel = (() => {
    const hay = `${req.source ?? ""} ${req.page_path ?? ""}`.toLowerCase();
    if (hay.includes("frisco")) return "Frisco page";
    if (hay.includes("plano")) return "Plano page";
    return null;
  })();

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
    ["Request", isWaterTest ? "Free water test" : "Free inspection / 3D quote"],
    ["Name", req.full_name],
    ["Phone", req.phone],
    ["Email", req.email],
    ["Address", `${req.address}, ${req.postal_code}`],
    ["Preferred date", req.preferred_date ?? "Not given"],
    ["Best time", req.preferred_contact_time ?? "Not given"],
    ["Pool details", req.pool_details ?? "Not given"],
    ["Notes", req.notes ?? "Not given"],
    ["Submitted", fmt(req.created_at)],
    [
      "Source",
      [req.source, req.utm_source, req.utm_campaign, req.page_path]
        .filter(Boolean)
        .join(" · ") || "Direct",
    ],
  ];

  const officeHtml = `<div style="font-family:Arial,Helvetica,sans-serif;color:#2b2b2b;">
  <h2 style="color:#8E1F2C;margin:0 0 12px;">New ${esc(kind)} request${originLabel ? ` · ${esc(originLabel)}` : ""}</h2>
  <table style="border-collapse:collapse;font-size:14px;">
    ${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 14px 4px 0;color:#7a6f63;">${esc(k)}</td><td style="padding:4px 0;"><strong>${esc(v)}</strong></td></tr>`,
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
          subject: `New ${kind} request${originLabel ? ` · ${originLabel}` : ""}, ${req.full_name} (${req.reference_number})`,
          html: officeHtml,
          text: officeText,
          label: "inspection-office-alert",
          purpose: "transactional",
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

  // Second, independent delivery path: drop the lead straight into the
  // connected Gmail mailbox so a transactional-email outage cannot lose it.
  try {
    const { sendLeadToGmailInbox, GMAIL_LEAD_INBOX } = await import("./gmail-lead-inbox.server");
    const gmail = await sendLeadToGmailInbox({
      subject: `New ${kind} request${originLabel ? ` · ${originLabel}` : ""}: ${req.full_name} (${req.reference_number})`,
      text: officeText,
      replyTo: req.email,
    });
    if (!results[GMAIL_LEAD_INBOX] || gmail.ok) {
      results[GMAIL_LEAD_INBOX] = gmail.ok ? "sent" : "failed";
    }
  } catch (e) {
    console.error("gmail lead inbox delivery failed", e);
  }

  // Owner text for finished surveys, so a new survey lead lands on the phone
  // straight away. Never allowed to break the submission.
  const isSurvey = (req.source ?? "").toLowerCase().startsWith("survey");
  let ownerSmsOutcome: "sent" | "failed" | "skipped" = "skipped";
  if (isSurvey) {
    try {
      // Pull the first answer lines out of the notes, minus consent wording.
      const answerLines = String(req.notes ?? "")
        .split("\n")
        .map((line) => line.trim())
        .filter(
          (line) =>
            line.length > 0 &&
            !/^marketing opt in/i.test(line) &&
            !/authorize|consent|message and data rates|unsubscribe/i.test(line),
        )
        .slice(0, 3)
        .join(" | ");
      const where = [req.address, req.postal_code].filter(Boolean).join(" ");
      const smsBody = [
        `Savvy Swim survey: ${req.full_name}`,
        req.phone ?? "",
        where,
        answerLines,
        `Ref ${req.reference_number}`,
      ]
        .filter(Boolean)
        .join("\n")
        .slice(0, 300);
      const { sendOpsAlertSms } = await import("./ops-alert.server");
      const outcome = await sendOpsAlertSms(smsBody);
      ownerSmsOutcome = outcome.startsWith("texted") ? "sent" : "failed";
      results["owner_sms"] = outcome;
    } catch (e) {
      console.error("owner survey sms failed", e);
      ownerSmsOutcome = "failed";
      results["owner_sms"] = "failed";
    }
  }





  // Homeowner confirmation.
  const firstName = esc(req.full_name.split(" ")[0]);
  const headline = isWaterTest
    ? `Thanks, ${firstName}, your free water test is booked in.`
    : `Thanks, ${firstName}, your free inspection is booked in.`;
  const body = isWaterTest
    ? `We have your pool at <strong>${esc(req.address)}</strong>. We'll run a full chemistry panel and send you the readings with exactly what your water needs. No obligation.`
    : `We have your pool at <strong>${esc(req.address)}</strong>. A tech reviews it within one business day and sends two visit windows to choose from.`;

  try {
    await sendLovableEmail(
      {
        to: req.email,
        from: FROM_ADDRESS,
        sender_domain: SENDER_DOMAIN,
        reply_to: REPLY_TO_ADDRESS,
        subject: isWaterTest
          ? `We got your water test request (${req.reference_number})`
          : `We got your inspection request (${req.reference_number})`,
        html: `<div style="background:#F4EFE3;padding:24px 0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E4DCCB;padding:32px 28px;">
    <p style="font-size:11px;letter-spacing:0.18em;color:#8E1F2C;margin:0 0 12px;">SAVVY SWIM · POOL CARE</p>
    <h2 style="font-size:26px;line-height:1.15;color:#12232E;margin:0 0 18px;">${headline}</h2>
    <p style="font-size:14px;color:#41474D;line-height:1.6;margin:0 0 18px;">${body}</p>
    <div style="background:#F4EFE3;border-left:3px solid #1FA9BE;padding:18px 20px;margin:0 0 22px;">
      <p style="font-size:14px;color:#12232E;line-height:1.5;margin:0;">Reference <strong>${esc(req.reference_number)}</strong>${
        req.preferred_date ? `<br />Requested date <strong>${esc(req.preferred_date)}</strong>` : ""
      }${
        req.preferred_contact_time
          ? `<br />Best time <strong>${esc(req.preferred_contact_time)}</strong>`
          : ""
      }</p>
    </div>
    <p style="margin:0 0 20px;"><a href="https://savvyswim.com/book?${new URLSearchParams(
      {
        name: req.full_name ?? "",
        phone: req.phone ?? "",
        ref: req.reference_number ?? "",
      },
    ).toString()}" style="background:#8E1F2C;color:#F4EFE3;text-decoration:none;padding:14px 22px;display:inline-block;font-weight:700;font-size:14px;">Pick my inspection time</a></p>
    <p style="font-size:14px;color:#41474D;line-height:1.6;margin:0 0 18px;">Need us sooner? Call or text <a href="tel:+18176637665" style="color:#8E1F2C;">817-663-7665</a>, or just reply to this email.</p>

    <hr style="border:none;border-top:1px solid #E4DCCB;margin:24px 0 16px;" />
    <p style="font-size:12px;color:#6C7278;line-height:1.5;margin:0;">Savvy Swim · Dallas–Fort Worth · savvyswim.com</p>
  </div>
</div>`,
        text: isWaterTest
          ? `Thanks, ${req.full_name.split(" ")[0]}. Your free water test request (${req.reference_number}) for ${req.address} is in. We'll send your full chemistry readings and what the water needs. Call or text 817-663-7665 (817-663-7665).`
          : `Thanks, ${req.full_name.split(" ")[0]}. Your free pool inspection request (${req.reference_number}) for ${req.address} is in. A tech reviews it within one business day and sends two visit windows. Call or text 817-663-7665 (817-663-7665).`,
        label: "inspection-confirmation",
        purpose: "transactional",
        idempotency_key: `inspection-confirm-${req.id}`,
      },
      { apiKey },
    );
    results[req.email] = "sent";
  } catch (e) {
    console.error("inspection confirmation failed", e);
    results[req.email] = "failed";
  }

  // Homeowner text confirmation. Only when the number gave an explicit
  // SMS opt-in (sendStatusSms enforces consent and appends STOP/HELP).
  let smsOutcome: "sent" | "failed" | "skipped" = "skipped";
  let smsTo: string | null = null;
  try {
    const { normalizePhone } = await import("./phone");
    smsTo = normalizePhone(req.phone ?? "");
    if (smsTo) {
      const { hasSmsOptIn } = await import("./sms-compliance.server");
      if (await hasSmsOptIn(smsTo)) {
        const { sendStatusSms } = await import("./appointment-status-notify.server");
        const smsText = isWaterTest
          ? `Savvy Swim: thanks ${req.full_name.split(" ")[0]}, your free water test request (${req.reference_number}) is in. We'll text your readings and next available windows. Questions? 817-663-7665`
          : `Savvy Swim: thanks ${req.full_name.split(" ")[0]}, your free inspection request (${req.reference_number}) is in. A tech reviews it within 1 business day and we'll text two visit windows. Questions? 817-663-7665`;
        smsOutcome = (await sendStatusSms(smsTo, smsText)) ? "sent" : "failed";
      }
    }
  } catch (e) {
    console.error("inspection sms confirmation failed", e);
    smsOutcome = "failed";
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
    ...(smsOutcome === "skipped"
      ? []
      : [
          {
            eventType: (smsOutcome === "sent" ? "sms_sent" : "sms_failed") as
              | "sms_sent"
              | "sms_failed",
            channel: "sms",
            recipient: smsTo,
            outcome: smsOutcome,
            detail: "Homeowner text confirmation",
          },
        ]),
  ]);

  return { sent: true, recipients: results, sms: { to: smsTo, outcome: smsOutcome } };
}

