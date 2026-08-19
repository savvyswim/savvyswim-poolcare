import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin lead sync status.
 *
 * Lists recent website leads with their CRM handoff state and lets the office
 * re-send one that failed. Office/owner only, verified server-side.
 */

export const LEAD_STATUSES = ["new", "scheduled", "confirmed", "declined", "converted"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type LeadSyncRow = {
  id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  postal_code: string | null;
  contact_consent: boolean;
  consent_text: string | null;
  source: string | null;
  lead_type: string | null;
  crm_synced_at: string | null;
  /** The CRM's own row id for this lead, when the CRM returns one. */
  crm_lead_id: string | null;
  lead_status: LeadStatus;
  status: "synced" | "failed" | "pending";
  last_attempt_at: string | null;
  attempts: number;
  http_status: number | null;
  last_error: string | null;
};

async function assertOffice(supabase: {
  rpc: (fn: "ss_is_office") => Promise<{ data: unknown; error: unknown }>;
}) {
  const { data } = await supabase.rpc("ss_is_office");
  if (data !== true) throw new Error("Office access required");
}

export const getLeadSyncStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertOffice(context.supabase as never);
    const { loadLeadSyncRows } = await import("./lead-sync.server");
    return loadLeadSyncRows();
  });

export const retryLeadSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOffice(context.supabase as never);
    const { forwardInspectionToCrm } = await import("./crm-lead-forward.server");
    const res = await forwardInspectionToCrm(data.id);
    return {
      ok: res.forwarded,
      detail: res.forwarded
        ? "Lead delivered to the CRM"
        : `CRM handoff failed${res.status ? ` (HTTP ${res.status})` : ""}`,
    };
  });

export const setLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({ id: z.string().uuid(), status: z.enum(LEAD_STATUSES) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOffice(context.supabase as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("inspection_requests")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true as const, status: data.status };
  });

export type BulkRetryResult = {
  attempted: number;
  recovered: number;
  stillFailing: number;
  ranAt: string;
};

/** Re-send every failed lead handoff in one bounded pass. Office only. */
export const retryFailedLeadSyncs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<BulkRetryResult> => {
    await assertOffice(context.supabase as never);
    const { retryFailedLeadSyncs: run } = await import("./lead-sync.server");
    return run(10);
  });
