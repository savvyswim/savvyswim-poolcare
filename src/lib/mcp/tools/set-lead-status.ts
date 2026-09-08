import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "./supabase";
import { loadDeliveries, syncState } from "./lead-sync";

export default defineTool({
  name: "set_lead_status",
  title: "Set lead status",
  description:
    "Update the pipeline status of one Savvy Swim website lead (new, scheduled, confirmed, declined, converted) and push the updated lead to the CRM lead pipeline.",
  inputSchema: {
    id: z.string().uuid().describe("Lead id (uuid)."),
    status: z
      .enum(["new", "scheduled", "confirmed", "declined", "converted"])
      .describe("New pipeline status for the lead."),
    sync_to_crm: z
      .boolean()
      .default(true)
      .describe("Re-send the lead to the CRM after updating (default true)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, status, sync_to_crm }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    // The write runs as the caller, so RLS decides whether they may touch this lead.
    const { data, error } = await supabase
      .from("inspection_requests")
      .update({ status })
      .eq("id", id)
      .select("id, full_name, status, crm_synced_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: `Lead ${id} was not updated. not found or not permitted.` }],
        isError: true,
      };
    }

    let crmNote = "CRM sync skipped.";
    if (sync_to_crm !== false) {
      // Only reached after the RLS-checked update above succeeded.
      const { forwardInspectionToCrm } = await import("@/lib/crm-lead-forward.server");
      try {
        const res = await forwardInspectionToCrm(id);
        crmNote = res.forwarded
          ? "Lead delivered to the CRM."
          : `CRM handoff failed${res.status ? ` (HTTP ${res.status})` : ""}.`;
      } catch (e) {
        crmNote = `CRM handoff error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    const deliveries = await loadDeliveries(supabase, [id]);
    const { data: fresh } = await supabase
      .from("inspection_requests")
      .select("crm_synced_at")
      .eq("id", id)
      .maybeSingle();
    const crm = syncState(fresh?.crm_synced_at ?? data.crm_synced_at ?? null, deliveries.get(id));

    return {
      content: [
        { type: "text", text: `Lead ${data.full_name ?? id} is now "${data.status}". ${crmNote}` },
      ],
      structuredContent: { lead: { id: data.id, full_name: data.full_name, status: data.status }, crm },
    };
  },
});
