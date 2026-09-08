import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "./supabase";
import { loadDeliveries, syncState } from "./lead-sync";

export default defineTool({
  name: "create_lead",
  title: "Create a lead",
  description:
    "Create a new Savvy Swim lead taken by phone, referral or walk-in, and hand it straight to the CRM sales pipeline. Use `update_lead` afterwards to fill in anything the customer adds later.",
  inputSchema: {
    full_name: z.string().describe("Homeowner or business name."),
    phone: z.string().optional().describe("Contact phone number."),
    email: z.string().optional().describe("Contact email."),
    address: z.string().optional().describe("Service street address (or city)."),
    postal_code: z.string().optional().describe("Service ZIP code."),
    preferred_date: z.string().optional().describe("Preferred visit date (YYYY-MM-DD)."),
    preferred_contact_time: z.string().optional().describe("Best time to reach the customer."),
    pool_details: z.string().optional().describe("Pool size, type, equipment and condition notes."),
    notes: z.string().optional().describe("What the customer asked for."),
    lead_type: z
      .enum(["free_inspection", "water_test"])
      .default("free_inspection")
      .describe("What the customer asked for."),
    source: z
      .string()
      .default("agent")
      .describe("Where the lead came from, e.g. phone_call, referral, agent."),
    sms_opt_in: z
      .boolean()
      .default(false)
      .describe("Only true when the customer explicitly agreed to texts."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const row = {
      full_name: input.full_name,
      email: input.email ?? "",
      phone: input.phone ?? "",
      address: input.address ?? "",
      postal_code: input.postal_code ?? null,
      preferred_date: input.preferred_date ?? null,
      preferred_contact_time: input.preferred_contact_time ?? null,
      pool_details: input.pool_details ?? null,
      notes: input.notes ?? null,
      lead_type: input.lead_type ?? "free_inspection",
      source: input.source ?? "agent",
      sms_opt_in: input.sms_opt_in === true,
      status: "new",
    };

    const { data, error } = await supabase
      .from("inspection_requests")
      .insert(row)
      .select("id, reference_number, full_name, status, crm_synced_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) {
      return {
        content: [{ type: "text", text: "Lead was not created. Not permitted." }],
        isError: true,
      };
    }

    let crmNote = "CRM handoff failed.";
    const { forwardInspectionToCrm } = await import("@/lib/crm-lead-forward.server");
    try {
      const res = await forwardInspectionToCrm(data.id, {
        leadType: row.lead_type,
        smsOptIn: row.sms_opt_in,
      });
      crmNote = res.forwarded
        ? "Lead delivered to the CRM."
        : `CRM handoff failed${res.status ? ` (HTTP ${res.status})` : ""}.`;
    } catch (e) {
      crmNote = `CRM handoff error: ${e instanceof Error ? e.message : String(e)}`;
    }

    const deliveries = await loadDeliveries(supabase, [data.id]);
    const { data: fresh } = await supabase
      .from("inspection_requests")
      .select("crm_synced_at, crm_lead_id")
      .eq("id", data.id)
      .maybeSingle();
    const crm = syncState(fresh?.crm_synced_at ?? data.crm_synced_at ?? null, deliveries.get(data.id));

    return {
      content: [
        {
          type: "text",
          text: `Created lead ${data.reference_number ?? data.id} for ${data.full_name}. ${crmNote}`,
        },
      ],
      structuredContent: { lead: { ..data, ..fresh }, crm },
    };
  },
});
