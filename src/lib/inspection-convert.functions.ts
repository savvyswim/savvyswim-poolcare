import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Turns an inspection request into a CRM customer record so quotes, contracts
 * and visits can be generated from it. Idempotent: a request that already has
 * a customer returns that customer instead of creating a duplicate.
 */
export const convertInspectionToCustomer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ requestId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    const { data: isOffice } = await supabase.rpc("ss_is_office");
    if (!isOffice) throw new Error("Only office staff can convert inspections");

    const { data: req, error } = await supabase
      .from("inspection_requests")
      .select(
        "id, full_name, email, phone, address, postal_code, pool_details, notes, reference_number, converted_customer_id",
      )
      .eq("id", data.requestId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!req) throw new Error("Request not found");
    if (req.converted_customer_id)
      return { customerId: req.converted_customer_id, created: false as const };

    const notes = [
      `Converted from inspection ${req.reference_number}`,
      req.pool_details ? `Pool: ${req.pool_details}` : null,
      req.notes ? `Notes: ${req.notes}` : null,
    ]
      .filter(Boolean)
      .join("\n");

    const { data: customer, error: insertError } = await supabase
      .from("ss_customers")
      .insert({
        full_name: req.full_name,
        email: req.email,
        phone: req.phone,
        address: req.address,
        postal_code: req.postal_code,
        internal_notes: notes,
      })
      .select("id")
      .single();
    if (insertError) throw new Error(insertError.message);

    const { error: linkError } = await supabase
      .from("inspection_requests")
      .update({
        converted_customer_id: customer.id,
        converted_at: new Date().toISOString(),
        status: "won",
      })
      .eq("id", req.id);
    if (linkError) throw new Error(linkError.message);

    const { logInspectionEvents } = await import("./inspection-events.server");
    await logInspectionEvents(req.id, [
      {
        eventType: "converted",
        statusTo: "won",
        detail: `Converted to customer ${req.full_name}`,
      },
    ]);

    return { customerId: customer.id, created: true as const };
  });
