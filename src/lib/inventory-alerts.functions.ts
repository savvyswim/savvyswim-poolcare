import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Checks inventory items against their reorder point and, for anything at or
 * below it, files an office alert and notifies ops by email + SMS. Deduped for
 * 24 hours per item so one busy afternoon can't spam the phone.
 */
export const checkLowStock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ itemIds: z.array(z.string().uuid()).max(200).optional() }).parse(data ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: isOffice } = await supabase.rpc("ss_is_office");
    if (!isOffice) throw new Error("Forbidden");

    let query = supabase.from("ss_inventory").select("id,name,unit,quantity,low_threshold");
    if (data.itemIds?.length) query = query.in("id", data.itemIds);
    const { data: items, error } = await query;
    if (error) throw new Error(error.message);

    const { dispatchLowStock } = await import("./inventory-alerts.server");
    return dispatchLowStock((items ?? []) as never);
  });
