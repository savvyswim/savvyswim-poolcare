import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Lead source reporting, where each booking / water test came from
 * (home, Frisco, Plano, every generic city page). Office/owner only.
 */

export type RangeKey = "7d" | "30d" | "90d" | "all";

export type LeadSourceLead = {
  id: string;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  status: string | null;
  source: string | null;
  page_path: string;
  lead_type: string | null;
  /** CRM handoff state for this lead. */
  crm_sync: "synced" | "failed" | "pending";
};

export type LeadSourceBucket = {
  key: string;
  total: number;
  booking: number;
  waterTest: number;
  share: number;
  first: string | null;
  last: string | null;
  leads: LeadSourceLead[];
};

export type LeadSourcesReport = {
  range: RangeKey;
  total: number;
  thisWeek: number;
  topCity: string | null;
  byCity: LeadSourceBucket[];
  byPage: LeadSourceBucket[];
  byCta: LeadSourceBucket[];
  byChannel: LeadSourceBucket[];
};

export const getLeadSources = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ range: z.enum(["7d", "30d", "90d", "all"]).default("30d") }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { data: isOffice } = await (
      context.supabase as unknown as {
        rpc: (fn: "ss_is_office") => Promise<{ data: unknown }>;
      }
    ).rpc("ss_is_office");
    if (isOffice !== true) throw new Error("Office access required");
    const { loadLeadSources } = await import("./lead-sources.server");
    return loadLeadSources(data.range);
  });
