import type {
  AdsPerformanceReport,
  AdsRange,
  AdsChannelRow,
  AdsCampaignRow,
  AdsMetricRow,
} from "./ads-performance.functions";

/**
 * Joins anonymous page views with free-inspection leads on the campaign tags
 * carried in the URL (utm_source / utm_medium / utm_campaign), so each paid
 * channel shows visits, leads and how many of those leads got scheduled.
 */

const RANGE_DAYS: Record<AdsRange, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

const BOOKED = new Set(["scheduled", "booked", "won", "converted", "customer", "completed"]);

const META = /(facebook|instagram|meta|^fb$|^ig$)/i;
const GOOGLE = /(google|adwords|gads)/i;
const PAID = /(cpc|ppc|paid|ads|social-paid)/i;

/** Human channel name from the campaign tags on a visit or lead. */
export function channelOf(
  source: string | null,
  medium: string | null,
  referrer?: string | null,
): string {
  const s = (source || "").trim();
  const m = (medium || "").trim();
  if (META.test(s) || META.test(m)) return PAID.test(m) || !m ? "Meta ads" : "Meta (organic)";
  if (GOOGLE.test(s) && PAID.test(m)) return "Google Ads";
  if (s) return `${s}${PAID.test(m) ? " (paid)" : ""}`;
  const ref = (referrer || "").toLowerCase();
  if (META.test(ref)) return "Meta (organic)";
  if (/google\./.test(ref)) return "Google (organic)";
  if (ref) return "Other referral";
  return "Direct / untagged";
}

function since(range: AdsRange): string | null {
  const days = RANGE_DAYS[range];
  return days === null ? null : new Date(Date.now() - days * 864e5).toISOString();
}

type Cell = { visits: number; leads: number; booked: number };
const cell = (): Cell => ({ visits: 0, leads: 0, booked: 0 });

function rate(part: number, whole: number): number {
  return whole ? Math.round((part / whole) * 1000) / 10 : 0;
}

function toRow(key: string, c: Cell): AdsCampaignRow {
  return {
    key,
    visits: c.visits,
    leads: c.leads,
    booked: c.booked,
    leadRate: rate(c.leads, c.visits),
    bookRate: rate(c.booked, c.leads),
  };
}

export async function loadAdsPerformance(range: AdsRange): Promise<AdsPerformanceReport> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const from = since(range);

  let visitQuery = supabaseAdmin
    .from("ss_site_events")
    .select("utm_source, utm_medium, utm_campaign")
    .eq("event", "page_view")
    .order("created_at", { ascending: false })
    .limit(20000);
  if (from) visitQuery = visitQuery.gte("created_at", from);

  let leadQuery = supabaseAdmin
    .from("inspection_requests")
    .select("status, utm_source, utm_medium, utm_campaign, referrer")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (from) leadQuery = leadQuery.gte("created_at", from);

  const [visitsRes, leadsRes] = await Promise.all([visitQuery, leadQuery]);
  if (visitsRes.error) throw new Error(visitsRes.error.message);
  if (leadsRes.error) throw new Error(leadsRes.error.message);

  const channels = new Map<string, Cell>();
  const campaigns = new Map<string, Map<string, Cell>>();

  const bump = (channel: string, campaign: string, key: keyof Cell) => {
    const c = channels.get(channel) ?? cell();
    c[key] += 1;
    channels.set(channel, c);
    const inner = campaigns.get(channel) ?? new Map<string, Cell>();
    const cc = inner.get(campaign) ?? cell();
    cc[key] += 1;
    inner.set(campaign, cc);
    campaigns.set(channel, inner);
  };

  for (const v of visitsRes.data ?? []) {
    bump(
      channelOf(v.utm_source, v.utm_medium),
      (v.utm_campaign || "").trim() || "No campaign tag",
      "visits",
    );
  }

  for (const l of leadsRes.data ?? []) {
    const channel = channelOf(l.utm_source, l.utm_medium, l.referrer);
    const campaign = (l.utm_campaign || "").trim() || "No campaign tag";
    bump(channel, campaign, "leads");
    if (BOOKED.has((l.status || "").toLowerCase())) bump(channel, campaign, "booked");
  }

  const rows: AdsChannelRow[] = [...channels.entries()]
    .map(([key, c]) => ({
      ...toRow(key, c),
      campaigns: [...(campaigns.get(key) ?? new Map<string, Cell>()).entries()]
        .map(([ck, cc]) => toRow(ck, cc))
        .sort((a, b) => b.leads - a.leads || b.visits - a.visits),
    }))
    .sort((a, b) => b.leads - a.leads || b.visits - a.visits);

  const metaRow: AdsChannelRow = rows.find((r) => r.key === "Meta ads") ?? {
    ...toRow("Meta ads", cell()),
    campaigns: [],
  };

  const totalVisits = rows.reduce((n, r) => n + r.visits, 0);

  return {
    range,
    meta: metaRow,
    channels: rows,
    totalVisits,
    totalLeads: rows.reduce((n, r) => n + r.leads, 0),
    totalBooked: rows.reduce((n, r) => n + r.booked, 0),
    noVisitData: totalVisits === 0,
  };
}
