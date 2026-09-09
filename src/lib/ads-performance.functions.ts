import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Ad performance reporting: visits that arrived from a paid campaign, the
 * free-inspection leads they produced, and how many of those leads turned
 * into a scheduled visit. Office/owner only.
 */

export type AdsRange = "7d" | "30d" | "90d" | "all";

export type AdsCampaignRow = {
  key: string;
  visits: number;
  leads: number;
  booked: number;
  leadRate: number;
  bookRate: number;
};

export type AdsChannelRow = AdsCampaignRow & {
  campaigns: AdsCampaignRow[];
};

export type AdsPerformanceReport = {
  range: AdsRange;
  meta: AdsChannelRow;
  channels: AdsChannelRow[];
  totalVisits: number;
  totalLeads: number;
  totalBooked: number;
  /** True when no page views were recorded yet in this range. */
  noVisitData: boolean;
};

export const getAdsPerformance = createServerFn({ method: "GET" })
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
    const { loadAdsPerformance } = await import("./ads-performance.server");
    return loadAdsPerformance(data.range);
  });
