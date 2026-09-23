/**
 * Saves the consultation day and window a customer picks on the thank you page
 * and tells the office about it. Server only.
 */
import { FROM_ADDRESS, SENDER_DOMAIN } from "@/lib/email-config";

const FALLBACK_OFFICE = "marcus@santanariveragroup.com";

const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Office notification list, with the same fallbacks as the new lead alert. */
async function officeRecipients(): Promise<string[]> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
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

  const list = [
    ...new Set(
      emails.map((e) => e.trim().toLowerCase()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)),
    ),
  ];
  return list.length > 0 ? list : [FALLBACK_OFFICE];
}

export type SaveConsultationInput = {
  reference: string;
  date: string;
  /** Human window, for example "Morning, 8:00 AM to 11:00 AM". */
  window: string;
  sameDay: boolean;
  prettyDate: string;
};

export type SaveConsultationResult =
  | { ok: true; reference: string }
  | { ok: false; reason: "not_found" };

export async function saveConsultationSlot(
  input: SaveConsultationInput,
): Promise<SaveConsultationResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Only a request from the last few days can still be timed from this page.
  const since = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { data: req } = await supabaseAdmin
    .from("inspection_requests")
    .select("id, reference_number, full_name, phone, email, address, postal_code")
    .eq("reference_number", input.reference)
    .gte("created_at", since)
    .maybeSingle();
  if (!req) return { ok: false, reason: "not_found" };

  await supabaseAdmin
    .from("inspection_requests")
    .update({
      preferred_date: input.date,
      preferred_contact_time: input.window,
    })
    .eq("id", req.id);

  // Put the free consultation on the route for that day. A failure here never
  // blocks the customer, the office alert below reports it instead.
  const { scheduleVisitFromRequest } = await import("@/lib/schedule-visit.server");
  const scheduled = await scheduleVisitFromRequest({
    requestId: req.id,
    date: input.date,
    window: input.window,
    note: input.sameDay ? "Same day request, call within the hour" : null,
  });
  const scheduleNote = scheduled.ok
    ? "Yes, on the schedule for that day"
    : `No, could not be placed (${scheduled.message})`;

  const { logInspectionEvents } = await import("@/lib/inspection-events.server");
  await logInspectionEvents(req.id, [
    {
      eventType: "status_change",
      channel: "web",
      outcome: "ok",
      statusTo: scheduled.ok ? "scheduled" : null,
      detail: `Customer picked ${input.prettyDate}, ${input.window}${input.sameDay ? " (same day request)" : ""}. Visit on schedule: ${scheduleNote}`,
    },
  ]);

  // Push the new day and window to the CRM so its copy of the lead matches.
  try {
    const { forwardInspectionToCrm } = await import("@/lib/crm-lead-forward.server");
    await forwardInspectionToCrm(req.id);
  } catch (err) {
    console.error("consultation slot CRM push failed", err);
  }

  const apiKey = process.env["LOVABLE_API_KEY"];
  if (apiKey) {
    const rows: [string, string][] = [
      ["Reference", req.reference_number ?? ""],
      ["Name", req.full_name ?? ""],
      ["Phone", req.phone ?? ""],
      ["Email", req.email ?? ""],
      ["Address", [req.address, req.postal_code].filter(Boolean).join(", ")],
      ["Day", input.prettyDate],
      ["Window", input.window],
      ["Same day", input.sameDay ? "Yes, asked for today" : "No"],
      ["Visit on schedule", scheduleNote],
    ];
    const html = `<div style="font-family:Arial,Helvetica,sans-serif;color:#2b2b2b;">
  <h2 style="color:#8E1F2C;margin:0 0 12px;">Consultation time picked${input.sameDay ? " · SAME DAY" : ""}</h2>
  <table style="border-collapse:collapse;font-size:14px;">
    ${rows
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 14px 4px 0;color:#7a6f63;">${esc(k)}</td><td style="padding:4px 0;"><strong>${esc(v)}</strong></td></tr>`,
      )
      .join("")}
  </table>
</div>`;
    const text = rows.map(([k, v]) => `${k}: ${v}`).join("\n");

    try {
      const { sendLovableEmail } = await import("@lovable.dev/email-js");
      for (const to of await officeRecipients()) {
        await sendLovableEmail(
          {
            to,
            from: FROM_ADDRESS,
            sender_domain: SENDER_DOMAIN,
            reply_to: req.email ?? undefined,
            subject: `${input.sameDay ? "Same day " : ""}consultation picked, ${req.full_name} (${req.reference_number})`,
            html,
            text,
            label: "consultation-slot-picked",
            purpose: "transactional",
            idempotency_key: `consult-${req.id}-${input.date}-${input.window}-${to}`.slice(0, 120),
          },
          { apiKey },
        );
      }
    } catch (err) {
      console.error("consultation slot office email failed", err);
    }
  }

  return { ok: true, reference: req.reference_number ?? input.reference };
}
