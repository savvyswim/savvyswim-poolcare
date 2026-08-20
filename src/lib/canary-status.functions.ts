import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { CanaryRouteReport } from "./canary-status.server";

/** Office/owner only — verified server-side, never trusted from the client. */
export const getCanaryRouteReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CanaryRouteReport> => {
    const { data: isOffice } = await (
      context.supabase as unknown as { rpc: (fn: "ss_is_office") => Promise<{ data: unknown }> }
    ).rpc("ss_is_office");
    if (isOffice !== true) throw new Error("Office access required");
    const { buildCanaryRouteReport } = await import("./canary-status.server");
    return buildCanaryRouteReport();
  });
