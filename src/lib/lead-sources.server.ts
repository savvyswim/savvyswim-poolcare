import { SERVICE_AREAS } from "./serviceAreas";
import type { LeadSourcesReport, LeadSourceLead, RangeKey } from "./lead-sources.functions";

/**
 * Aggregates website leads by the page (and therefore the city) they came from.
 * Read-only reporting for the office console.
 */

const EXTRA_PATHS: Record<string, string> = {
  "/": "Home",
  "/home": "Home",
  "/services": "Services",
  "/weekly-pool-service": "Weekly Pool Service",
  "/book": "Booking link",
  "/booking": "Booking link",
  "/b": "Booking link",
  "/free-inspection": "Free inspection",
  "/request-inspection": "Free inspection",
};

const bySlug = new Map(SERVICE_AREAS.map((a) => [a.slug, a.name]));

function titleize(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Map a page path (and CTA source as fallback) onto a city / page bucket. */
export function cityFromPath(pathRaw: string | null, source: string | null): string {
  const path = (pathRaw || "").split("?")[0]!.replace(/\/+$/, "") || "/";
  const direct = EXTRA_PATHS[path];
  if (direct) return direct;

  // /plano, /pool-cleaning-plano, /pool-cleaning-plano-tx
  const seg = path.replace(/^\//, "").split("/")[0] ?? "";
  const slug = seg.replace(/^pool-cleaning-/, "").replace(/-tx$/, "");
  if (bySlug.has(slug)) return bySlug.get(slug)!;

  if (source) {
    const s = source.replace(/^city_/, "").replace(/^swim_club_/, "");
    const base = s.split(/[_:]/)[0] ?? "";
    if (bySlug.has(base)) return bySlug.get(base)!;
    if (bySlug.has(s)) return bySlug.get(s)!;
  }

  if (slug) return titleize(slug);
  return "Unknown";
}

function channelOf(referrer: string | null, utmSource: string | null): string {
  const u = (utmSource || "").toLowerCase();
  if (u && u !== "savvyswim.com" && u !== "savvyswimservices.com") return u;
  const ref = (referrer || "").toLowerCase();
  if (!ref) return "Direct / none";
  if (/google\./.test(ref)) return "Google";
  if (/bing\./.test(ref)) return "Bing";
  if (/(facebook|instagram|t\.co|linkedin|nextdoor)/.test(ref)) return "Social";
  try {
    return new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return "Referral";
  }
}

const RANGE_DAYS: Record<RangeKey, number | null> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  all: null,
};

export async function loadLeadSources(range: RangeKey): Promise<LeadSourcesReport> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const days: number | null = RANGE_DAYS[range] ?? null;

  let q = supabaseAdmin
    .from("inspection_requests")
    .select(
      "id, created_at, full_name, phone, email, status, source, lead_type, page_path, landing_page, referrer, utm_source, utm_campaign",
    )
    .order("created_at", { ascending: false })
    .limit(5000);
  if (days !== null) q = q.gte("created_at", new Date(Date.now() - days * 864e5).toISOString());

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const rows = data ?? [];

  type Bucket = {
    key: string;
    total: number;
    booking: number;
    waterTest: number;
    first: string;
    last: string;
    leads: LeadSourceLead[];
  };
  const mk = (key: string): Bucket => ({
    key,
    total: 0,
    booking: 0,
    waterTest: 0,
    first: "",
    last: "",
    leads: [],
  });

  const cities = new Map<string, Bucket>();
  const pages = new Map<string, Bucket>();
  const ctas = new Map<string, Bucket>();
  const channels = new Map<string, Bucket>();

  const weekAgo = Date.now() - 7 * 864e5;
  let thisWeek = 0;

  for (const r of rows) {
    const path = (r.page_path || r.landing_page || "/").split("?")[0]!;
    const city = cityFromPath(path, r.source);
    const isWater = (r.lead_type || "").includes("water");
    const lead: LeadSourceLead = {
      id: r.id,
      created_at: r.created_at,
      full_name: r.full_name ?? null,
      phone: r.phone ?? null,
      email: r.email ?? null,
      status: r.status ?? null,
      source: r.source ?? null,
      page_path: path,
      lead_type: r.lead_type ?? null,
    };
    if (new Date(r.created_at).getTime() >= weekAgo) thisWeek += 1;

    const add = (map: Map<string, Bucket>, key: string) => {
      const b = map.get(key) ?? mk(key);
      b.total += 1;
      if (isWater) b.waterTest += 1;
      else b.booking += 1;
      if (!b.last || r.created_at > b.last) b.last = r.created_at;
      if (!b.first || r.created_at < b.first) b.first = r.created_at;
      if (b.leads.length < 50) b.leads.push(lead);
      map.set(key, b);
    };

    add(cities, city);
    add(pages, path.replace(/\/+$/, "") || "/");
    add(ctas, r.source || "unknown");
    add(channels, channelOf(r.referrer, r.utm_source));
  }

  const total = rows.length;
  const finish = (map: Map<string, Bucket>) =>
    [...map.values()]
      .sort((a, b) => b.total - a.total || a.key.localeCompare(b.key))
      .map((b) => ({
        key: b.key,
        total: b.total,
        booking: b.booking,
        waterTest: b.waterTest,
        share: total ? Math.round((b.total / total) * 1000) / 10 : 0,
        first: b.first || null,
        last: b.last || null,
        leads: b.leads,
      }));

  const byCity = finish(cities);
  return {
    range,
    total,
    thisWeek,
    topCity: byCity[0]?.key ?? null,
    byCity,
    byPage: finish(pages),
    byCta: finish(ctas),
    byChannel: finish(channels),
  };
}
