import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FROM_ADDRESS, REPLY_TO_ADDRESS, SENDER_DOMAIN } from "@/lib/email-config";
import {
  CONFIRMATION_PREFIX,
  FOLLOW_UP_PREFIX,
  deriveStage,
  isPlaceholderEmail,
  type BookingStage,
} from "@/lib/booking-stage";

/**
 * Booking follow up: one request at a time, so the office can reply to the
 * homeowner and put the visit on the route. Office/owner only, and every
 * detail in the outgoing message is read back from the database.
 */

export interface BookingDetail {
  id: string;
  reference_number: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  postal_code: string | null;
  preferred_date: string | null;
  preferred_contact_time: string | null;
  pool_details: string | null;
  notes: string | null;
  status: string | null;
  source: string | null;
  page_path: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  sms_opt_in: boolean;
  created_at: string;
  crm_synced_at: string | null;
  converted_customer_id: string | null;
}

export interface BookingEvent {
  id: string;
  created_at: string;
  event_type: string;
  channel: string | null;
  recipient: string | null;
  outcome: string | null;
  detail: string | null;
  status_to: string | null;
}

export interface BookingVisit {
  id: string;
  scheduled_date: string;
  status: string;
  notes: string | null;
}

export interface BookingDetailResult {
  booking: BookingDetail;
  events: BookingEvent[];
  visits: BookingVisit[];
  stage: BookingStage;
  hasRealEmail: boolean;
}

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function dayLabel(date: string | null): string | null {
  if (!date) return null;
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

async function assertOffice(supabase: unknown): Promise<void> {
  const { data: isOffice } = await (
    supabase as { rpc: (fn: "ss_is_office") => Promise<{ data: unknown }> }
  ).rpc("ss_is_office");
  if (isOffice !== true) throw new Error("Office access required");
}

export const getBookingDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }): Promise<BookingDetailResult> => {
    await assertOffice(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("inspection_requests")
      .select(
        "id, reference_number, full_name, phone, email, address, postal_code, preferred_date, preferred_contact_time, pool_details, notes, status, source, page_path, utm_source, utm_medium, utm_campaign, utm_content, sms_opt_in, created_at, crm_synced_at, converted_customer_id",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Booking request not found");

    const { data: events } = await supabaseAdmin
      .from("inspection_events")
      .select("id, created_at, event_type, channel, recipient, outcome, detail, status_to")
      .eq("request_id", data.id)
      .order("created_at", { ascending: false })
      .limit(60);

    let visits: BookingVisit[] = [];
    const customerId = (row as { converted_customer_id: string | null }).converted_customer_id;
    if (customerId) {
      const { data: visitRows } = await supabaseAdmin
        .from("ss_visits")
        .select("id, scheduled_date, status, notes")
        .eq("customer_id", customerId)
        .order("scheduled_date", { ascending: false })
        .limit(10);
      visits = (visitRows ?? []) as unknown as BookingVisit[];
    }

    const evs = (events ?? []) as unknown as BookingEvent[];
    return {
      booking: { ...(row as unknown as BookingDetail), sms_opt_in: Boolean(row.sms_opt_in) },
      events: evs,
      visits,
      stage: deriveStage({
        status: (row.status as string | null) ?? null,
        events: evs,
        visitStatuses: visits.map((v) => v.status),
      }),
      hasRealEmail: !isPlaceholderEmail(row.email as string | null),
    };
  });

const ReplyInput = z.object({
  id: z.string().uuid(),
  message: z.string().trim().min(5).max(2000),
  alsoText: z.boolean().default(false),
  markContacted: z.boolean().default(true),
});

export const sendBookingReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ReplyInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertOffice(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error } = await supabaseAdmin
      .from("inspection_requests")
      .select(
        "id, reference_number, full_name, phone, email, address, preferred_date, preferred_contact_time, status, sms_opt_in",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!req) throw new Error("Booking request not found");
    if (isPlaceholderEmail(req.email as string | null))
      throw new Error("This request has no email address, call them instead");

    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Email is not configured");

    const first = (req.full_name ?? "there").split(" ")[0];
    const day = dayLabel(req.preferred_date as string | null);
    const slot = (req.preferred_contact_time as string | null) ?? null;
    const paragraphs = data.message
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map(
        (p) =>
          `<p style="font-size:14px;color:#41474D;line-height:1.6;margin:0 0 16px;">${esc(p).replace(/\n/g, "<br />")}</p>`,
      )
      .join("");

    const { sendLovableEmail } = await import("@lovable.dev/email-js");
    let emailOutcome: "sent" | "failed" = "sent";
    try {
      await sendLovableEmail(
        {
          to: req.email as string,
          from: FROM_ADDRESS,
          sender_domain: SENDER_DOMAIN,
          reply_to: REPLY_TO_ADDRESS,
          subject: day
            ? `Your pool inspection on ${day} (${req.reference_number})`
            : `About your pool inspection request (${req.reference_number})`,
          html: `<div style="background:#F4EFE3;padding:24px 0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E4DCCB;padding:32px 28px;">
    <p style="font-size:11px;letter-spacing:0.18em;color:#8E1F2C;margin:0 0 12px;">SAVVY SWIM · POOL CARE</p>
    <h2 style="font-size:24px;line-height:1.15;color:#12232E;margin:0 0 18px;">Hi ${esc(first)},</h2>
    ${paragraphs}
    <div style="background:#F4EFE3;border-left:3px solid #1FA9BE;padding:18px 20px;margin:0 0 22px;">
      <p style="font-size:14px;color:#12232E;line-height:1.5;margin:0;">Reference <strong>${esc(req.reference_number)}</strong><br />Pool <strong>${esc(req.address)}</strong>${
        day ? `<br />Visit day <strong>${esc(day)}</strong>` : ""
      }${slot ? `<br />Window <strong>${esc(slot)}</strong>` : ""}</p>
    </div>
    <p style="margin:0 0 20px;"><a href="https://savvyswim.com/book" style="background:#8E1F2C;color:#F4EFE3;text-decoration:none;padding:14px 22px;display:inline-block;font-weight:700;font-size:14px;">Pick a different time</a></p>
    <p style="font-size:14px;color:#41474D;line-height:1.6;margin:0 0 18px;">Call or text <a href="tel:+18176637665" style="color:#8E1F2C;">817-663-7665</a>, or just reply to this email.</p>
    <hr style="border:none;border-top:1px solid #E4DCCB;margin:24px 0 16px;" />
    <p style="font-size:12px;color:#6C7278;line-height:1.5;margin:0;">Savvy Swim · Dallas-Fort Worth · savvyswim.com</p>
  </div>
</div>`,
          text: `Hi ${first},\n\n${data.message}\n\nReference ${req.reference_number}. Pool ${req.address}.${
            day ? ` Visit day ${day}.` : ""
          }${slot ? ` Window ${slot}.` : ""}\n\nPick a different time: https://savvyswim.com/book\nCall or text 817-663-7665.`,
          label: "booking-followup",
          purpose: "transactional",
          idempotency_key: `booking-reply-${req.id}-${Date.now()}`,
        },
        { apiKey },
      );
    } catch (e) {
      console.error("booking reply email failed", e);
      emailOutcome = "failed";
    }

    let smsOutcome: "sent" | "failed" | "skipped" = "skipped";
    let smsTo: string | null = null;
    if (data.alsoText) {
      try {
        const { normalizePhone } = await import("./phone");
        smsTo = normalizePhone((req.phone as string) ?? "");
        if (smsTo) {
          const { hasSmsOptIn } = await import("./sms-compliance.server");
          if (await hasSmsOptIn(smsTo)) {
            const { sendStatusSms } = await import("./appointment-status-notify.server");
            const smsBody = `Savvy Swim: ${data.message.slice(0, 380)}${
              day ? ` (${day})` : ""
            } Ref ${req.reference_number}.`;
            smsOutcome = (await sendStatusSms(smsTo, smsBody)) ? "sent" : "failed";
          }
        }
      } catch (e) {
        console.error("booking reply sms failed", e);
        smsOutcome = "failed";
      }
    }

    const { logInspectionEvents } = await import("./inspection-events.server");
    await logInspectionEvents(req.id as string, [
      {
        eventType: emailOutcome === "sent" ? "email_sent" : "email_failed",
        channel: "email",
        recipient: req.email as string,
        outcome: emailOutcome,
        detail: `${FOLLOW_UP_PREFIX}: ${data.message.slice(0, 300)}`,
      },
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
              detail: `${FOLLOW_UP_PREFIX} text`,
            },
          ]),
    ]);

    return { ok: emailOutcome === "sent", email: emailOutcome, sms: smsOutcome };
  });

const ScheduleInput = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  window: z.string().trim().max(60).optional(),
  note: z.string().trim().max(500).optional(),
});

export const scheduleBookingVisit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ScheduleInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertOffice(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error } = await supabaseAdmin
      .from("inspection_requests")
      .select(
        "id, reference_number, full_name, phone, email, address, postal_code, status, converted_customer_id",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!req) throw new Error("Booking request not found");

    const previousStatus = (req.status as string | null) ?? "new";

    // Same find or create plus booking path the thank you page picker uses.
    const { scheduleVisitFromRequest } = await import("./schedule-visit.server");
    const scheduled = await scheduleVisitFromRequest({
      requestId: req.id as string,
      date: data.date,
      window: data.window ?? null,
      note: data.note ?? null,
    });
    if (!scheduled.ok) {
      throw new Error(
        scheduled.reason === "customer_failed"
          ? "Could not create the customer record"
          : "Could not put this visit on the route",
      );
    }

    const { data: visit } = await supabaseAdmin
      .from("ss_visits")
      .select("id, scheduled_date, status, notes")
      .eq("id", scheduled.visitId)
      .single();

    const { logInspectionEvents } = await import("./inspection-events.server");
    await logInspectionEvents(req.id as string, [
      {
        eventType: "status_change",
        statusFrom: previousStatus,
        statusTo: "scheduled",
        detail: `Visit scheduled for ${data.date}${data.window ? ` (${data.window})` : ""}`,
      },
    ]);

    return {
      ok: true,
      customerId: scheduled.customerId,
      visit: visit as unknown as BookingVisit,
    };
  });


const ConfirmInput = z.object({
  id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  window: z.string().trim().max(60).optional(),
});

/** One click confirmation email: day, window, reference and a reschedule link. */
export const sendBookingConfirmation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ConfirmInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertOffice(context.supabase);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: req, error } = await supabaseAdmin
      .from("inspection_requests")
      .select("id, reference_number, full_name, phone, email, address, preferred_date, preferred_contact_time")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!req) throw new Error("Booking request not found");
    if (isPlaceholderEmail(req.email as string | null))
      throw new Error("This request has no email address, call them instead");
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (!apiKey) throw new Error("Email is not configured");

    const date = data.date ?? (req.preferred_date as string | null);
    const day = dayLabel(date);
    const slot = data.window ?? (req.preferred_contact_time as string | null) ?? null;
    const first = (req.full_name ?? "there").split(" ")[0];
    const link = `https://savvyswim.com/book?${new URLSearchParams({
      name: (req.full_name as string) ?? "",
      phone: (req.phone as string) ?? "",
      ref: (req.reference_number as string) ?? "",
    }).toString()}`;

    const { sendLovableEmail } = await import("@lovable.dev/email-js");
    let outcome: "sent" | "failed" = "sent";
    try {
      await sendLovableEmail(
        {
          to: req.email as string,
          from: FROM_ADDRESS,
          sender_domain: SENDER_DOMAIN,
          reply_to: REPLY_TO_ADDRESS,
          subject: day
            ? `Confirmed: your free pool inspection on ${day} (${req.reference_number})`
            : `Your free pool inspection is confirmed (${req.reference_number})`,
          html: `<div style="background:#F4EFE3;padding:24px 0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#FFFFFF;border:1px solid #E4DCCB;padding:32px 28px;">
    <p style="font-size:11px;letter-spacing:0.18em;color:#8E1F2C;margin:0 0 12px;">SAVVY SWIM · POOL CARE</p>
    <h2 style="font-size:26px;line-height:1.15;color:#12232E;margin:0 0 18px;">You're confirmed, ${esc(first)}.</h2>
    <p style="font-size:14px;color:#41474D;line-height:1.6;margin:0 0 18px;">Your free pool inspection is on the schedule. Our tech will call or text when they are on the way. You do not need to be home as long as we can reach the gate.</p>
    <div style="background:#F4EFE3;border-left:3px solid #1FA9BE;padding:18px 20px;margin:0 0 22px;">
      <p style="font-size:14px;color:#12232E;line-height:1.5;margin:0;">${day ? `Day <strong>${esc(day)}</strong><br />` : ""}${slot ? `Arrival <strong>${esc(slot)}</strong><br />` : ""}Pool <strong>${esc(req.address)}</strong><br />Reference <strong>${esc(req.reference_number)}</strong></p>
    </div>
    <p style="margin:0 0 20px;"><a href="${link}" style="background:#8E1F2C;color:#F4EFE3;text-decoration:none;padding:14px 22px;display:inline-block;font-weight:700;font-size:14px;">Pick a different time</a></p>
    <p style="font-size:14px;color:#41474D;line-height:1.6;margin:0 0 18px;">Questions? Call or text <a href="tel:+18176637665" style="color:#8E1F2C;">817-663-7665</a>, or just reply to this email.</p>
    <hr style="border:none;border-top:1px solid #E4DCCB;margin:24px 0 16px;" />
    <p style="font-size:12px;color:#6C7278;line-height:1.5;margin:0;">Savvy Swim · Dallas-Fort Worth · savvyswim.com</p>
  </div>
</div>`,
          text: `You're confirmed, ${first}. Your free pool inspection is on the schedule.${day ? ` Day: ${day}.` : ""}${slot ? ` Arrival: ${slot}.` : ""} Pool: ${req.address}. Reference ${req.reference_number}.\n\nPick a different time: ${link}\nCall or text 817-663-7665.`,
          label: "booking-confirmation",
          purpose: "transactional",
          idempotency_key: `booking-confirm-${req.id}-${date ?? "none"}-${slot ?? "none"}`,
        },
        { apiKey },
      );
    } catch (e) {
      console.error("booking confirmation email failed", e);
      outcome = "failed";
    }

    const { logInspectionEvents } = await import("./inspection-events.server");
    await logInspectionEvents(req.id as string, [
      {
        eventType: outcome === "sent" ? "email_sent" : "email_failed",
        channel: "email",
        recipient: req.email as string,
        outcome,
        detail: `${CONFIRMATION_PREFIX}${day ? ` for ${day}` : ""}${slot ? `, ${slot}` : ""}`,
      },
    ]);
    return { ok: outcome === "sent" };
  });
