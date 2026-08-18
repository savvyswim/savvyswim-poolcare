import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { loadDeliveries, syncState } from "../lead-sync";

const LEAD_FIELDS =
  "id, created_at, full_name, email, phone, address, postal_code, service_type, preferred_date, status, source, lead_type, crm_synced_at";

export default defineTool({
  name: "list_leads",
  title: "List website leads",
  description:
    "List recent Savvy Swim website leads (booking and water-test requests), newest first, each with its CRM sync state. Optionally filter by status, CRM sync state, or search by name, email, phone or address.",
  inputSchema: {
    limit: z.number().int().min(1).max(50).default(10).describe("How many leads to return (1-50)."),
    status: z
      .enum(["new", "scheduled", "confirmed", "declined", "converted"])
      .optional()
      .describe("Only return leads with this status."),
    sync_status: z
      .enum(["synced", "failed", "pending"])
      .optional()
      .describe("Only return leads in this CRM handoff state."),
    search: z.string().trim().min(2).optional().describe("Match name, email, phone or address."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, status, sync_status, search }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const take = limit ?? 10;
    let query = supabase
      .from("inspection_requests")
      .select(LEAD_FIELDS)
      .order("created_at", { ascending: false })
      // Over-fetch when filtering on sync state, which is computed after the read.
      .limit(sync_status ? Math.min(take * 5, 200) : take);
    if (status) query = query.eq("status", status);
    if (search) {
      const like = `%${search.replace(/[%,]/g, "")}%`;
      query = query.or(
        `full_name.ilike.${like},email.ilike.${like},phone.ilike.${like},address.ilike.${like}`,
      );
    }
    const { data, error } = await query;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const rows = (data ?? []) as Array<Record<string, unknown> & { id: string; crm_synced_at: string | null }>;
    const deliveries = await loadDeliveries(supabase, rows.map((r) => r.id));
    let leads = rows.map((r) => ({ ...r, crm: syncState(r.crm_synced_at ?? null, deliveries.get(r.id)) }));
    if (sync_status) leads = leads.filter((l) => l.crm.sync_status === sync_status).slice(0, take);

    return {
      content: [{ type: "text", text: JSON.stringify(leads, null, 2) }],
      structuredContent: { leads },
    };
  },
});
