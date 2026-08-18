import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { loadDeliveries, syncState } from "../lead-sync";

export default defineTool({
  name: "get_lead",
  title: "Get a lead",
  description:
    "Fetch the full detail of one Savvy Swim website lead by its id, including contact info, consent, attribution and its CRM handoff state (synced/failed/pending, attempts and last error).",
  inputSchema: { id: z.string().uuid().describe("Lead id (uuid).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("inspection_requests")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: `No lead found with id ${id}` }], isError: true };

    const deliveries = await loadDeliveries(supabase, [id]);
    const lead = { ...data, crm: syncState((data as { crm_synced_at?: string | null }).crm_synced_at ?? null, deliveries.get(id)) };
    return {
      content: [{ type: "text", text: JSON.stringify(lead, null, 2) }],
      structuredContent: { lead },
    };
  },
});
