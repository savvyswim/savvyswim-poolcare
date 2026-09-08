/**
 * 404 monitoring.
 *
 * Every missing route is written to ss_not_found_events so the office can see
 * broken links immediately on /admin/not-found. Two situations page on-call:
 *
 *  - a 404 reached from one of our own pages (a genuinely broken internal link)
 *  - a burst of hits on the same path (a bad printed/QR/ad URL in the wild)
 *
 * Nothing here may throw: monitoring must never break a page render.
 */
import { sendOpsAlertEmail, sendOpsAlertSms } from "./ops-alert.server";

/** Hits on one path within the window before it counts as a burst. */
const BURST_THRESHOLD = 5;
const BURST_WINDOW_MS = 60 * 60 * 1000;
/** One page per path per this long, however many hits arrive. */
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;

/** Paths that 404 constantly from bots/scanners, logged, never alerted. */
const NOISE = [
  /^\/wp-/i,
  /^\/wordpress/i,
  /\.php$/i,
  /^\/\.env/i,
  /^\/\.git/i,
  /^\/vendor\//i,
  /^\/admin\.php/i,
  /^\/cgi-bin/i,
];

export type NotFoundHit = {
  path: string;
  fullUrl?: string | null;
  referrer?: string | null;
  source?: "client" | "ssr";
  userAgent?: string | null;
  ip?: string | null;
};

function isNoise(path: string): boolean {
  return NOISE.some((re) => re.test(path));
}

function isInternalReferrer(referrer: string | null | undefined): boolean {
  if (!referrer) return false;
  try {
    const host = new URL(referrer).hostname.replace(/^www\./, "");
    return host.endsWith("savvyswim.com") || host.endsWith("savvyswimservices.com") || host === "localhost";
  } catch {
    return false;
  }
}

export async function recordNotFound(hit: NotFoundHit): Promise<void> {
  try {
    const path = (hit.path || "/").slice(0, 300);
    const internal = isInternalReferrer(hit.referrer);
    const noise = isNoise(path);

    console.warn(
      JSON.stringify({ tag: "not-found", path, internal, source: hit.source ?? "client" }),
    );

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const sinceBurst = new Date(Date.now() - BURST_WINDOW_MS).toISOString();
    const sinceCooldown = new Date(Date.now() - ALERT_COOLDOWN_MS).toISOString();

    const [{ count: recentHits }, { data: recentAlert }] = await Promise.all([
      supabaseAdmin
        .from("ss_not_found_events")
        .select("id", { count: "exact", head: true })
        .eq("path", path)
        .gte("created_at", sinceBurst),
      supabaseAdmin
        .from("ss_not_found_events")
        .select("id")
        .eq("path", path)
        .eq("alerted", true)
        .gte("created_at", sinceCooldown)
        .limit(1)
        .maybeSingle(),
    ]);

    const burst = (recentHits ?? 0) + 1 >= BURST_THRESHOLD;
    const shouldAlert = !noise && !recentAlert && (internal || burst);

    let alertResult: string | null = null;
    if (shouldAlert) {
      const reason = internal
        ? "linked from our own site (broken internal link)"
        : `${(recentHits ?? 0) + 1} hits in the last hour`;
      const summary = [
        "Savvy Swim 404 alert",
        `Path: ${path}`,
        `Reason: ${reason}`,
        `Referrer: ${hit.referrer ?? "none"}`,
        `URL: ${hit.fullUrl ?? path}`,
        "",
        "Review: /admin/not-found",
      ].join("\n");
      const [email, sms] = await Promise.all([
        sendOpsAlertEmail(`Savvy Swim 404: ${path}`, summary, "not-found-alert"),
        sendOpsAlertSms(`Savvy Swim 404 on ${path}, ${reason}. See /admin/not-found`),
      ]);
      alertResult = `${email}; ${sms}`;
    }

    await supabaseAdmin.from("ss_not_found_events").insert({
      path,
      full_url: hit.fullUrl?.slice(0, 600) ?? null,
      referrer: hit.referrer?.slice(0, 600) ?? null,
      internal_referrer: internal,
      source: hit.source ?? "client",
      user_agent: hit.userAgent?.slice(0, 300) ?? null,
      ip_address: hit.ip?.slice(0, 60) ?? null,
      alerted: shouldAlert,
      alert_result: alertResult,
    });
  } catch {
    // Monitoring must never break the page.
  }
}

export type NotFoundEventRow = {
  id: string;
  path: string;
  full_url: string | null;
  referrer: string | null;
  internal_referrer: boolean;
  source: string;
  user_agent: string | null;
  alerted: boolean;
  alert_result: string | null;
  created_at: string;
};

export type NotFoundPathSummary = {
  path: string;
  hits7d: number;
  hits24h: number;
  internalHits: number;
  lastSeen: string;
  lastReferrer: string | null;
};

export type NotFoundReport = {
  total24h: number;
  total7d: number;
  internal7d: number;
  distinctPaths7d: number;
  paths: NotFoundPathSummary[];
  recent: NotFoundEventRow[];
  alerts: NotFoundEventRow[];
};

export async function buildNotFoundReport(): Promise<NotFoundReport> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const since7d = new Date(Date.now() - 7 * 864e5).toISOString();
  const since24h = Date.now() - 864e5;

  const { data, error } = await supabaseAdmin
    .from("ss_not_found_events")
    .select(
      "id, path, full_url, referrer, internal_referrer, source, user_agent, alerted, alert_result, created_at",
    )
    .gte("created_at", since7d)
    .order("created_at", { ascending: false })
    .limit(2000);
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as NotFoundEventRow[];
  const byPath = new Map<string, NotFoundPathSummary>();
  for (const row of rows) {
    const at = new Date(row.created_at).getTime();
    const existing = byPath.get(row.path);
    if (existing) {
      existing.hits7d += 1;
      if (at >= since24h) existing.hits24h += 1;
      if (row.internal_referrer) existing.internalHits += 1;
    } else {
      byPath.set(row.path, {
        path: row.path,
        hits7d: 1,
        hits24h: at >= since24h ? 1 : 0,
        internalHits: row.internal_referrer ? 1 : 0,
        lastSeen: row.created_at,
        lastReferrer: row.referrer,
      });
    }
  }

  return {
    total7d: rows.length,
    total24h: rows.filter((r) => new Date(r.created_at).getTime() >= since24h).length,
    internal7d: rows.filter((r) => r.internal_referrer).length,
    distinctPaths7d: byPath.size,
    paths: [...byPath.values()].sort((a, b) => b.hits7d - a.hits7d).slice(0, 50),
    recent: rows.slice(0, 100),
    alerts: rows.filter((r) => r.alerted).slice(0, 40),
  };
}
