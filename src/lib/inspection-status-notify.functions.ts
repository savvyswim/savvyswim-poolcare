import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FROM_ADDRESS, REPLY_TO_ADDRESS, SENDER_DOMAIN } from "@/lib/email-config";

const TWILIO_GATEWAY = "https://connector-gateway.lovable.dev/twilio";
const FALLBACK_OFFICE = "marcus@santanariveragroup.com";

/**
 * High-intent alert: fires when staff move an inspection request to
 * "scheduled" or "completed". Only the id + the new status come from the
 * client. every detail in the message is read back from the database.
 */
export const notifyInspectionStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        requestId: z.string().uuid(),
        status: z.enum(["scheduled", "completed"]),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    // Only office/owner staff may trigger outbound alerts.
    const { data: isStaff } = await context.supabase.rpc("ss_is_staff");
    if (!isStaff) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req, error } = await supabaseAdmin
      .from("inspection_requests")
      .select(
        "id, reference_number, full_name, phone, email, address, postal_code, preferred_date, preferred_contact_time",
      )
      .eq("id", data.requestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!req) throw new Error("Request not found");

    const slot = req.preferred_contact_time ?? ", ";
    const headline =
      data.status === "scheduled"
        ? `Inspection SCHEDULED: ${req.full_name}`
        : `Inspection COMPLETED: ${req.full_name}`;
    const line = `${headline}\n${req.reference_number}\n${req.address}, ${req.postal_code}\n${
      req.preferred_date ?? "date TBD"
    } · ${slot}\n${req.phone}`;

    // ---- recipients -------------------------------------------------------
    const { data: settings } = await supabaseAdmin
      .from("ss_settings")
      .select("key, value")
      .in("key", ["office_notification_emails", "office_alert_phones"]);

    const emails: string[] = [];
    const phones: string[] = [];
    for (const row of settings ?? []) {
      const raw = row.value as unknown;
      if (!Array.isArray(raw)) continue;
      for (const v of raw) {
        if (typeof v !== "string") continue;
        if (row.key === "office_notification_emails") emails.push(v);
        else phones.push(v);
      }
    }

    const { data: staff } = await supabaseAdmin
      .from("ss_staff")
      .select("email, phone, level, is_active")
      .eq("is_active", true)
      .in("level", ["owner", "office_manager"]);
    for (const s of staff ?? []) {
      if (emails.length === 0 && s.email) emails.push(s.email);
      if (phones.length === 0 && s.phone) phones.push(s.phone);
    }

    const toEmails = [
      ..new Set(
        emails
          .map((e) => e.trim().toLowerCase())
          .filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)),
      ),
    ];
    if (toEmails.length === 0) toEmails.push(FALLBACK_OFFICE);

    const toPhones = [
      ..new Set(
        phones
          .map((p) => p.replace(/[^\d+]/g, ""))
          .map((p) => (p.length === 10 ? `+1${p}` : p))
          .filter((p) => /^\+\d{10,15}$/.test(p)),
      ),
    ];

    const result = { email: {} as Record<string, string>, sms: {} as Record<string, string> };

    // ---- email ------------------------------------------------------------
    const apiKey = process.env["LOVABLE_API_KEY"];
    if (apiKey) {
      const { sendLovableEmail } = await import("@lovable.dev/email-js");
      const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#2b2b2b;">
  <h2 style="color:#8E1F2C;margin:0 0 12px;">${headline}</h2>
  <table style="border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:4px 14px 4px 0;color:#7a6f63;">Reference</td><td><strong>${req.reference_number}</strong></td></tr>
    <tr><td style="padding:4px 14px 4px 0;color:#7a6f63;">Address</td><td><strong>${req.address}, ${req.postal_code}</strong></td></tr>
    <tr><td style="padding:4px 14px 4px 0;color:#7a6f63;">Window</td><td><strong>${req.preferred_date ?? "TBD"} · ${slot}</strong></td></tr>
    <tr><td style="padding:4px 14px 4px 0;color:#7a6f63;">Phone</td><td><strong>${req.phone}</strong></td></tr>
  </table>
  <p style="font-size:12px;color:#7a6f63;margin-top:18px;">Savvy Swim CRM → Inspection Requests</p>
</div>`;
      for (const to of toEmails) {
        try {
          await sendLovableEmail(
            {
              to,
              from: FROM_ADDRESS,
              sender_domain: SENDER_DOMAIN,
              reply_to: REPLY_TO_ADDRESS,
              subject: `${headline} (${req.reference_number})`,
              html,
              text: line,
              label: "inspection-status-alert",
              purpose: "transactional",
              idempotency_key: `inspection-status-${req.id}-${data.status}-${to}`,
            },
            { apiKey },
          );
          result.email[to] = "sent";
        } catch (e) {
          console.error("inspection status email failed", e);
          result.email[to] = "failed";
        }
      }
    }

    // ---- sms --------------------------------------------------------------
    const twilioKey = process.env["TWILIO_API_KEY"];
    if (apiKey && twilioKey && toPhones.length > 0) {
      const headers = { Authorization: `Bearer ${apiKey}`, "X-Connection-Api-Key": twilioKey };
      try {
        const numbersRes = await fetch(`${TWILIO_GATEWAY}/IncomingPhoneNumbers.json?PageSize=1`, {
          headers,
        });
        if (!numbersRes.ok) {
          const detail = await numbersRes.text();
          throw new Error(`Twilio numbers lookup failed [${numbersRes.status}]: ${detail}`);
        }
        const numbers = (await numbersRes.json()) as {
          incoming_phone_numbers?: { phone_number?: string }[];
        };
        const from = numbers.incoming_phone_numbers?.[0]?.phone_number;
        if (!from) throw new Error("No Twilio sending number available");

        for (const to of toPhones) {
          const res = await fetch(`${TWILIO_GATEWAY}/Messages.json`, {
            method: "POST",
            headers: { ..headers, "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ To: to, From: from, Body: line }),
          });
          if (!res.ok) {
            const detail = await res.text();
            console.error(`Twilio send failed [${res.status}]: ${detail}`);
            result.sms[to] = "failed";
          } else {
            result.sms[to] = "sent";
          }
        }
      } catch (e) {
        console.error("inspection status sms failed", e);
      }
    }

    const { logInspectionEvents } = await import("./inspection-events.server");
    await logInspectionEvents(req.id, [
      {
        eventType: "status_change",
        statusTo: data.status,
        detail: `Marked ${data.status}, ${req.reference_number}`,
      },
      ..Object.entries(result.email).map(([to, outcome]) => ({
        eventType: (outcome === "sent" ? "email_sent" : "email_failed") as
          | "email_sent"
          | "email_failed",
        channel: "email",
        recipient: to,
        outcome,
        detail: headline,
      })),
      ..Object.entries(result.sms).map(([to, outcome]) => ({
        eventType: (outcome === "sent" ? "sms_sent" : "sms_failed") as "sms_sent" | "sms_failed",
        channel: "sms",
        recipient: to,
        outcome,
        detail: headline,
      })),
    ]);

    return { ok: true as const, ..result };
  });

/**
 * Records a status move that does not send an alert (contacted, lost, new…),
 * so the attribution timeline stays complete for every stage of the funnel.
 */
export const logInspectionStatusChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        requestId: z.string().uuid(),
        statusFrom: z.string().max(40).nullable().optional(),
        statusTo: z.string().max(40),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { data: isStaff } = await context.supabase.rpc("ss_is_staff");
    if (!isStaff) throw new Error("Forbidden");

    const { logInspectionEvents } = await import("./inspection-events.server");
    await logInspectionEvents(data.requestId, [
      {
        eventType: "status_change",
        statusFrom: data.statusFrom ?? null,
        statusTo: data.statusTo,
        detail: `Moved to ${data.statusTo}`,
      },
    ]);
    return { ok: true as const };
  });
