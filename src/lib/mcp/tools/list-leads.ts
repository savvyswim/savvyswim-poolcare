import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

const LEAD_FIELDS =
  "id, created_at, full_name, email, phone, address, postal_code, service_type, preferred_date, status, source, lead_type, crm_synced_at";

export default defineTool({
  name: "list_leads",
  title: "List website leads",
  description:
    "List recent Savvy Swim website leads (booking and water-test requests), newest first. Optionally filter by status or search by name, email, phone or address.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10).describe("How many leads to return (1-50)."),
    status: z
      .enum(["new", "scheduled", "confirmed", "declined", "converted"])
      .optional()
      .describe("Only return leads with this status."),
    search: z.string().trim().min(2).optional().describe("Match name, email, phone or address."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status, search }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let query = supabase
      .from("inspection_requests")
      .select(LEAD_FIELDS)
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (status) query = query.eq("status", status);
    if (search) {
      const like = `%${search.replace(/[%,]/g, "")}%`;
      query = query.or(
        `full_name.ilike.${like},email.ilike.${like},phone.ilike.${like},address.ilike.${like}`,
      );
    }
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { leads: data ?? [] },
    };
  },
});
