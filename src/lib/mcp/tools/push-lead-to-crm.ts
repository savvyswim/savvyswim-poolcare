import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { loadDeliveries, syncState } from "../lead-sync";

export default defineTool({
  name: "push_lead_to_crm",
  title: "Push a lead to the CRM",
  description:
    "Re-send one Savvy Swim website lead to the CRM sales pipeline and report the result (CRM row id, HTTP status, last error). Use this when a lead shows a failed or pending CRM sync.",
  inputSchema: { id: z.string().uuid().describe("Lead id (uuid).") },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    // Read first so RLS — not the admin forwarder — decides who may push this lead.
    const { data: lead, error } = await supabase
      .from("inspection_requests")
      .select("id, reference_number, full_name")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!lead) {
      return { content: [{ type: "text", text: `No lead found with id ${id}` }], isError: true };
    }

    let note: string;
    let forwarded = false;
    const { forwardInspectionToCrm } = await import("@/lib/crm-lead-forward.server");
    try {
      const res = await forwardInspectionToCrm(id);
      forwarded = res.forwarded;
      note = res.forwarded
        ? "Lead delivered to the CRM."
        : `CRM handoff failed${res.status ? ` (HTTP ${res.status})` : ""}.`;
    } catch (e) {
      note = `CRM handoff error: ${e instanceof Error ? e.message : String(e)}`;
    }

    const deliveries = await loadDeliveries(supabase, [id]);
    const { data: fresh } = await supabase
      .from("inspection_requests")
      .select("crm_synced_at, crm_lead_id")
      .eq("id", id)
      .maybeSingle();
    const crm = syncState(fresh?.crm_synced_at ?? null, deliveries.get(id));

    return {
      content: [
        {
          type: "text",
          text: `${lead.reference_number ?? id} — ${note}${
            fresh?.crm_lead_id ? ` CRM record ${fresh.crm_lead_id}.` : ""
          }`,
        },
      ],
      structuredContent: { forwarded, crm_lead_id: fresh?.crm_lead_id ?? null, crm },
      ...(forwarded ? {} : { isError: true as const }),
    };
  },
});
