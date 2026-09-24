/**
 * Turns a website request into a real visit on the route.
 *
 * Used by the thank you page consultation picker and by the office follow up
 * page, so both put the pool owner and the visit on the schedule the same way.
 * Server only.
 */

export type ScheduleFromRequestInput = {
  /** inspection_requests.id */
  requestId: string;
  /** Visit day, YYYY-MM-DD. */
  date: string;
  /** Human arrival window, for example "Morning, 8:00 AM to 11:00 AM arrival". */
  window?: string | null;
  /** Extra note for the tech. */
  note?: string | null;
};

export type ScheduleFromRequestResult =
  | { ok: true; customerId: string; visitId: string }
  | { ok: false; reason: "not_found" | "customer_failed" | "visit_failed"; message: string };

/**
 * Finds or creates the pool owner from the request, books the visit and links
 * the request to it. Never throws, callers decide how to report a failure.
 */
export async function scheduleVisitFromRequest(
  input: ScheduleFromRequestInput,
): Promise<ScheduleFromRequestResult> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: req } = await supabaseAdmin
      .from("inspection_requests")
      .select(
        "id, reference_number, full_name, phone, email, address, postal_code, notes, converted_customer_id",
      )
      .eq("id", input.requestId)
      .maybeSingle();
    if (!req) return { ok: false, reason: "not_found", message: "Request not found" };

    let customerId = (req.converted_customer_id as string | null) ?? null;
    if (!customerId && req.phone) {
      const { data: match } = await supabaseAdmin
        .from("ss_customers")
        .select("id")
        .eq("phone", req.phone)
        .maybeSingle();
      customerId = (match?.id as string | undefined) ?? null;
    }
    if (!customerId) {
      const { data: created, error: createError } = await supabaseAdmin
        .from("ss_customers")
        .insert({
          full_name: req.full_name ?? "New pool owner",
          phone: req.phone ?? null,
          email: req.email ?? null,
          address: req.address ?? null,
          postal_code: req.postal_code ?? null,
        })
        .select("id")
        .single();
      if (createError || !created) {
        return {
          ok: false,
          reason: "customer_failed",
          message: createError?.message ?? "Could not create the customer record",
        };
      }
      customerId = created.id as string;
    }

    const notes = [
      `Free consultation from website request ${req.reference_number ?? ""}`.trim(),
      input.window ? `Arrival ${input.window}` : null,
      input.note || null,
      req.notes ? `Customer said: ${String(req.notes).slice(0, 800)}` : null,
    ]
      .filter(Boolean)
      .join(". ");

    const { data: visit, error: visitError } = await supabaseAdmin
      .from("ss_visits")
      .insert({
        customer_id: customerId,
        scheduled_date: input.date,
        status: "pending",
        notes,
      })
      .select("id")
      .single();
    if (visitError || !visit) {
      return {
        ok: false,
        reason: "visit_failed",
        message: visitError?.message ?? "Could not put the visit on the route",
      };
    }

    await supabaseAdmin
      .from("inspection_requests")
      .update({
        status: "scheduled",
        converted_customer_id: customerId,
        converted_at: new Date().toISOString(),
      })
      .eq("id", req.id);

    const { syncRequestToCrmLead } = await import("./crm-local-lead.server");
    await syncRequestToCrmLead(req.id, { stage: "follow_up", customerId });
    await inviteToPortal(customerId, req.id as string).catch((e) =>
      console.error("portal invite skipped", e),
    );


    return { ok: true, customerId, visitId: visit.id as string };
  } catch (err) {
    console.error("scheduleVisitFromRequest failed", err);
    return {
      ok: false,
      reason: "visit_failed",
      message: err instanceof Error ? err.message : "Unknown scheduling error",
    };
  }
}
