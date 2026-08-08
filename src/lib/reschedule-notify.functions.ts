import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Sends the updated confirmation (SMS or email, per the customer's notification
 * preferences) right after a visit is rescheduled from /portal. Includes the new
 * date, arrival window, and any note the customer left.
 */
export const sendRescheduleNotice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z
      .object({
        visitId: z.string().uuid(),
        previousDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
        note: z.string().max(500).nullable().optional(),
        created: z.boolean().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const helpers = await import("./reschedule-notify.server");
    const { normalizePhone } = await import("./phone");

    const { data: visit, error } = await supabase
      .from("ss_visits")
      .select("id, customer_id, scheduled_date, notes")
      .eq("id", data.visitId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!visit) throw new Error("Visit not found");

    const { data: customer } = await supabase
      .from("ss_customers")
      .select("id, full_name, email, phone, address, city, notify_visits, preferred_contact")
      .eq("id", visit.customer_id)
      .maybeSingle();
    if (!customer) throw new Error("Customer not found");
    if (customer.notify_visits === false) return { channels: [] as string[], skipped: "opted-out" };

    const notice = {
      firstName: (customer.full_name ?? "there").split(" ")[0] ?? "there",
      when: helpers.prettyDate(visit.scheduled_date),
      slot: helpers.windowFromNotes(visit.notes ?? null),
      note: data.note?.trim() || null,
      previousWhen:
        data.previousDate && data.previousDate !== visit.scheduled_date
          ? helpers.prettyDate(data.previousDate)
          : null,
      address: [customer.address, customer.city].filter(Boolean).join(", ") || null,
      created: Boolean(data.created),
    };

    // The visit moved, so every configured reminder offset must fire again for
    // the new date. Clearing the dedupe rows re-arms the whole schedule.
    if (!data.created) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin
        .from("ss_feed")
        .delete()
        .eq("visit_id", visit.id)
        .like("kind", "reminder%");
    }

    const channels: string[] = [];
    const channel = (customer.preferred_contact ?? "email").toLowerCase();
    const wantsText = channel === "sms" || channel === "phone";
    const phone = customer.phone ? normalizePhone(customer.phone) : null;

    if (wantsText && phone && (await helpers.sendSms(phone, helpers.smsBody(notice)))) {
      channels.push("sms");
    }
    if (!channels.length && customer.email) {
      const key = `${visit.id}:${visit.scheduled_date}:${notice.note ? notice.note.length : 0}`;
      if (await helpers.sendEmail(customer.email, notice, key)) channels.push("email");
    }

    if (channels.length) {
      await supabase.from("ss_feed").insert({
        customer_id: customer.id,
        visit_id: visit.id,
        kind: "notification",
        title: `Updated confirmation sent — ${notice.when}`,
        body: `Arrival window ${notice.slot}.${notice.note ? ` Note: ${notice.note}` : ""} Sent by ${channels[0] === "sms" ? "text message" : "email"}.`,
        sent_by_sms: channels[0] === "sms",
      });
    }

    return { channels };
  });
