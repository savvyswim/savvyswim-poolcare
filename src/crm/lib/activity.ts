import { supabase } from "@/integrations/supabase/client";

/** Append an event to a lead's audit timeline. Never throws — logging must not block work. */
export async function logLeadEvent(
  leadId: string,
  eventType: string,
  label: string,
  detail?: string | null,
) {
  try {
    const { data: auth } = await supabase.auth.getUser();
    await supabase.from("ss_lead_events").insert({
      lead_id: leadId,
      event_type: eventType,
      label,
      detail: detail ?? null,
      actor_id: auth.user?.id ?? null,
    });
  } catch {
    /* activity logging is best-effort */
  }
}

/** Append an entry to a customer's activity log (ss_feed). Never throws. */
export async function logCustomerActivity(
  customerId: string,
  title: string,
  body?: string | null,
  kind = "update",
) {
  try {
    await supabase.from("ss_feed").insert({
      customer_id: customerId,
      kind,
      title,
      body: body ?? null,
    });
  } catch {
    /* best-effort */
  }
}

/** Find the marketing lead a customer was converted from, if any. */
export async function leadForCustomer(customerId: string) {
  const { data } = await supabase
    .from("ss_leads")
    .select("id,full_name")
    .eq("converted_customer_id", customerId)
    .maybeSingle();
  return data ?? null;
}

/** Record a technician assignment on both the job's customer and its source lead. */
export async function logTechAssignment(opts: {
  customerId: string | null;
  jobTitle: string;
  techName: string | null;
}) {
  const { customerId, jobTitle, techName } = opts;
  if (!customerId) return;
  const title = techName ? `Technician assigned — ${techName}` : "Technician unassigned";
  await logCustomerActivity(customerId, title, `Job: ${jobTitle}`, "job");
  const lead = await leadForCustomer(customerId);
  if (lead) await logLeadEvent(lead.id, "tech_assigned", title, jobTitle);
}
