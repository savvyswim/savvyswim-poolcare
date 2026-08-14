import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Website → CRM lead handoff RPC. The implementation lives in
 * crm-lead-forward.server.ts so the public lead endpoint can reuse it.
 */
export const forwardLeadToCrm = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ requestId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { forwardInspectionToCrm } = await import("./crm-lead-forward.server");
    return forwardInspectionToCrm(data.requestId);
  });
