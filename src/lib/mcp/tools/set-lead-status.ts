import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "set_lead_status",
  title: "Set lead status",
  description:
    "Update the pipeline status of one Savvy Swim website lead (new, scheduled, confirmed, declined, converted).",
  inputSchema: {
    id: z.string().uuid().describe("Lead id (uuid)."),
    status: z
      .enum(["new", "scheduled", "confirmed", "declined", "converted"])
      .describe("New pipeline status for the lead."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id, status }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("inspection_requests")
      .update({ status })
      .eq("id", id)
      .select("id, full_name, status")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: `Lead ${id} was not updated — not found or not permitted.` }],
        isError: true,
      };
    }
    return {
      content: [{ type: "text", text: `Lead ${data.full_name ?? id} is now "${data.status}".` }],
      structuredContent: { lead: data },
    };
  },
});
