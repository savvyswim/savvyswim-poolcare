import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Admin lead sync status.
 *
 * Lists recent website leads with their CRM handoff state and lets the office
 * re-send one that failed. Office/owner only, verified server-side.
 */

export type LeadSyncRow = {
  id: string;
  created_at: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  postal_code: string | null;
  contact_consent: boolean;
  consent_text: string | null;
  source: string | null;
  lead_type: string | null;
  crm_synced_at: string | null;
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
