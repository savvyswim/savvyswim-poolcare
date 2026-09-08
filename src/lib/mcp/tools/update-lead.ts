import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";
import { loadDeliveries, syncState } from "../lead-sync";

/** Drop keys the caller left out so we never null a field by accident. */
function patchFrom(input: Record<string, unknown>, keys: readonly string[]) {
  const patch: Record<string, unknown> = {};
  for (const key of keys) {
    const value = input[key];
    if (value === undefined) continue;
    patch[key] = typeof value === "string" && value.trim() === "" ? null : value;
  }
  return patch;
}

const FIELDS = [
  "full_name",
  "email",
  "phone",
  "address",
  "postal_code",
  "preferred_date",
  "preferred_contact_time",
  "pool_details",
  "notes",
  "lead_type",
  "source",
  "status",
] as const;

export default defineTool({
  name: "update_lead",
  title: "Update a lead",
  description:
    "Fill in or correct a Savvy Swim website lead, contact details (name, phone, email, address, ZIP), service details (lead type, preferred date, contact time, pool details, notes) and pipeline fields (status, source). Then push the refreshed lead to the CRM. Only the fields you pass are changed.",
  inputSchema: {
    id: z.string().uuid().describe("Lead id (uuid)."),
    full_name: z.string().optional().describe("Contact name."),
    email: z.string().optional().describe("Contact email."),
    phone: z.string().optional().describe("Contact phone number."),
    address: z.string().optional().describe("Service street address."),
    postal_code: z.string().optional().describe("Service ZIP code."),
    preferred_date: z.string().optional().describe("Preferred visit date (YYYY-MM-DD)."),
    preferred_contact_time: z.string().optional().describe("Best time to reach the customer."),
    pool_details: z.string().optional().describe("Pool size, type, equipment and condition notes."),
    notes: z.string().optional().describe("Free-form notes about the request."),
    lead_type: z
      .enum(["free_inspection", "water_test"])
      .optional()
      .describe("What the customer asked for."),
    source: z.string().optional().describe("Attribution label, e.g. phone_call, referral, website."),
    status: z
      .enum(["new", "scheduled", "confirmed", "declined", "converted"])
      .optional()
      .describe("Pipeline status."),
    sync_to_crm: z
      .boolean()
      .default(true)
      .describe("Push the updated lead to the CRM afterwards (default true)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { id, sync_to_crm } = input;
    const patch = patchFrom(input as Record<string, unknown>, FIELDS);
    if (Object.keys(patch).length === 0) {
      return {
        content: [{ type: "text", text: "Nothing to update, pass at least one field." }],
        isError: true,
      };
    }

    const supabase = supabaseForUser(ctx);
    // Runs as the caller, so RLS decides whether they may touch this lead.
    const { data, error } = await supabase
      .from("inspection_requests")
      .update(patch)
      .eq("id", id)
      .select(
        "id, reference_number, full_name, email, phone, address, postal_code, preferred_date, preferred_contact_time, pool_details, notes, lead_type, source, status, crm_synced_at, crm_lead_id",
      )
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: `Lead ${id} was not updated. Not found or not permitted.` }],
        isError: true,
      };
    }

    let crmNote = "CRM sync skipped.";
    if (sync_to_crm !== false) {
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
      .select("crm_synced_at, crm_lead_id")
      .eq("id", id)
      .maybeSingle();
    const crm = syncState(fresh?.crm_synced_at ?? data.crm_synced_at ?? null, deliveries.get(id));

    return {
      content: [
        {
          type: "text",
          text: `Updated ${Object.keys(patch).join(", ")} on lead ${data.reference_number ?? id}. ${crmNote}`,
        },
        { type: "text", text: JSON.stringify({ ...data, ...fresh }, null, 2) },
      ],
      structuredContent: { lead: { ...data, ...fresh }, crm },
    };
  },
});
