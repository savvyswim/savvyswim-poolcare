/**
 * Per-route canary status.
 *
 * A canary run probes every monitored route several times. This module folds
 * those probes down to one row per route in ss_canary_route_checks so staff can
 * see, at a glance, when each page was last checked and when it last passed.
 */

import type { CanaryRun } from "./canary";
import { selectCanaryRoutes, isGuardedRoute, isRedirectRoute } from "./canary-routes";

export type CanaryRouteRow = {
  route: string;
  target: string;
  last_checked_at: string;
  last_ok_at: string | null;
  last_status: string;
  last_kind: string | null;
  last_http_status: number | null;
  last_duration_ms: number | null;
  last_message: string | null;
  consecutive_failures: number;
  checks_total: number;
};

export type CanaryRouteTrend = {
  requests: number;
  failures: number;
  errorRate: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
  samples: number;
  lastSampleAt: string | null;
};

export type CanaryRouteStatus = CanaryRouteRow & {
  monitored: boolean;
  guarded: boolean;
  redirect: boolean;
  stale: boolean;
  trend24h: CanaryRouteTrend;
};

export type CanaryRouteReport = {
  generatedAt: string;
  target: string;
  routes: CanaryRouteStatus[];
  monitoredCount: number;
  failingCount: number;
  neverCheckedCount: number;
  staleCount: number;
  overall24h: CanaryRouteTrend;
  lastRun: {
    startedAt: string;
    finishedAt: string | null;
    status: string;
    source: string;
    requests: number;
    failures: number;
    slowestMs: number;
  } | null;
};

const DEFAULT_TARGET = "https://savvyswim.com";
/** A route with no successful probe in this window is treated as stale. */
const STALE_AFTER_MS = 6 * 60 * 60 * 1000;
const TREND_WINDOW_MS = 24 * 60 * 60 * 1000;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)] ?? 0;
}

function emptyTrend(): CanaryRouteTrend {
  return { requests: 0, failures: 0, errorRate: 0, avgMs: 0, p95Ms: 0, maxMs: 0, samples: 0, lastSampleAt: null };
}

/**
 * Latency + error-rate samples for one run, one row per route. This is the
 * time series behind the trend columns in /admin/canary.
 */
export async function recordRouteMetrics(run: CanaryRun, runId: string | null, source: string): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const byRoute = new Map<string, { durations: number[]; failures: number; lastStatus: number | null }>();
  for (const probe of run.probes) {
    const entry = byRoute.get(probe.route) ?? { durations: [], failures: 0, lastStatus: null };
    entry.durations.push(probe.durationMs);
    if (!probe.ok) entry.failures += 1;
    entry.lastStatus = probe.httpStatus;
    byRoute.set(probe.route, entry);
  }
  if (byRoute.size === 0) return;

  const rows = Array.from(byRoute.entries()).map(([route, entry]) => {
    const sorted = [...entry.durations].sort((a, b) => a - b);
    const requests = sorted.length;
    const total = sorted.reduce((sum, ms) => sum + ms, 0);
    return {
      run_id: runId,
      route,
      target: run.target,
      source,
      checked_at: run.finishedAt,
      requests,
      failures: entry.failures,
      error_rate: requests ? Number((entry.failures / requests).toFixed(4)) : 0,
      avg_ms: Math.round(total / Math.max(1, requests)),
      min_ms: sorted[0] ?? 0,
      max_ms: sorted[sorted.length - 1] ?? 0,
      p95_ms: percentile(sorted, 95),
      last_http_status: entry.lastStatus,
    };
  });

  const { error } = await supabaseAdmin.from("ss_canary_route_metrics").insert(rows);
  if (error) throw error;
}


/** Fold a run's probes into one record per route and upsert them. */
export async function recordRouteChecks(run: CanaryRun, runId: string | null): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const byRoute = new Map<string, { ok: boolean; last: CanaryRun["probes"][number]; count: number }>();
  for (const probe of run.probes) {
    const entry = byRoute.get(probe.route);
    if (!entry) byRoute.set(probe.route, { ok: probe.ok, last: probe, count: 1 });
    else {
      entry.ok = entry.ok && probe.ok;
      entry.count += 1;
      // Keep a failing probe as the representative one, otherwise the newest.
      if (!probe.ok || entry.last.ok) entry.last = probe;
    }
  }
  if (byRoute.size === 0) return;

  const routes = Array.from(byRoute.keys());
  const { data: existing } = await supabaseAdmin
    .from("ss_canary_route_checks")
    .select("route, consecutive_failures, checks_total, last_ok_at")
    .eq("target", run.target)
    .in("route", routes);

  const prior = new Map((existing ?? []).map((row) => [row.route, row]));

  const rows = Array.from(byRoute.entries()).map(([route, entry]) => {
    const before = prior.get(route);
    return {
      route,
      target: run.target,
      last_checked_at: run.finishedAt,
      last_ok_at: entry.ok ? run.finishedAt : (before?.last_ok_at ?? null),
      last_status: entry.ok ? "ok" : "failed",
      last_kind: entry.last.kind,
      last_http_status: entry.last.httpStatus,
      last_duration_ms: entry.last.durationMs,
      last_message: entry.ok ? null : entry.last.message,
      consecutive_failures: entry.ok ? 0 : (before?.consecutive_failures ?? 0) + 1,
      checks_total: (before?.checks_total ?? 0) + entry.count,
      last_run_id: runId,
      updated_at: new Date().toISOString(),
    };
  });

  const { error } = await supabaseAdmin
    .from("ss_canary_route_checks")
    .upsert(rows, { onConflict: "route,target" });
  if (error) throw error;
}

/** Current monitored routes joined with their last recorded check. */
export async function buildCanaryRouteReport(target = DEFAULT_TARGET): Promise<CanaryRouteReport> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const since = new Date(Date.now() - TREND_WINDOW_MS).toISOString();

  const [{ data: checks }, { data: runs }, { data: metrics }] = await Promise.all([
    supabaseAdmin
      .from("ss_canary_route_checks")
      .select(
        "route, target, last_checked_at, last_ok_at, last_status, last_kind, last_http_status, last_duration_ms, last_message, consecutive_failures, checks_total",
      )
      .eq("target", target),
    supabaseAdmin
      .from("ss_canary_runs")
      .select("started_at, finished_at, status, source, requests, failures, slowest_ms")
      .eq("target", target)
      .order("started_at", { ascending: false })
      .limit(1),
    supabaseAdmin
      .from("ss_canary_route_metrics")
      .select("route, checked_at, requests, failures, avg_ms, max_ms, p95_ms")
      .eq("target", target)
      .gte("checked_at", since)
      .order("checked_at", { ascending: false })
      .limit(5000),
  ]);

  const trends = new Map<string, CanaryRouteTrend>();
  const p95s = new Map<string, number[]>();
  for (const row of metrics ?? []) {
    const t = trends.get(row.route) ?? emptyTrend();
    t.requests += row.requests;
    t.failures += row.failures;
    t.samples += 1;
    t.avgMs += row.avg_ms * row.requests;
    t.maxMs = Math.max(t.maxMs, row.max_ms);
    if (!t.lastSampleAt || row.checked_at > t.lastSampleAt) t.lastSampleAt = row.checked_at;
    trends.set(row.route, t);
    p95s.set(row.route, [...(p95s.get(row.route) ?? []), row.p95_ms]);
  }
  for (const [route, t] of trends) {
    t.avgMs = t.requests ? Math.round(t.avgMs / t.requests) : 0;
    t.errorRate = t.requests ? Number((t.failures / t.requests).toFixed(4)) : 0;
    t.p95Ms = percentile([...(p95s.get(route) ?? [])].sort((a, b) => a - b), 95);
  }

  const stored = new Map((checks ?? []).map((row) => [row.route, row as CanaryRouteRow]));
  const monitored = selectCanaryRoutes();
  const now = Date.now();

  const all = Array.from(new Set([...monitored, ...stored.keys()])).sort();
  const routes: CanaryRouteStatus[] = all.map((route) => {
    const row = stored.get(route);
    const lastOk = row?.last_ok_at ? Date.parse(row.last_ok_at) : null;
    return {
      route,
      target,
      last_checked_at: row?.last_checked_at ?? "",
      last_ok_at: row?.last_ok_at ?? null,
      last_status: row?.last_status ?? "unknown",
      last_kind: row?.last_kind ?? null,
      last_http_status: row?.last_http_status ?? null,
      last_duration_ms: row?.last_duration_ms ?? null,
      last_message: row?.last_message ?? null,
      consecutive_failures: row?.consecutive_failures ?? 0,
      checks_total: row?.checks_total ?? 0,
      monitored: monitored.includes(route),
      guarded: isGuardedRoute(route),
      redirect: isRedirectRoute(route),
      stale: lastOk === null ? true : now - lastOk > STALE_AFTER_MS,
      trend24h: trends.get(route) ?? emptyTrend(),
    };
  });

  const overall24h = emptyTrend();
  const allP95: number[] = [];
  for (const r of routes) {
    overall24h.requests += r.trend24h.requests;
    overall24h.failures += r.trend24h.failures;
    overall24h.samples += r.trend24h.samples;
    overall24h.avgMs += r.trend24h.avgMs * r.trend24h.requests;
    overall24h.maxMs = Math.max(overall24h.maxMs, r.trend24h.maxMs);
    if (r.trend24h.p95Ms) allP95.push(r.trend24h.p95Ms);
    if (r.trend24h.lastSampleAt && (!overall24h.lastSampleAt || r.trend24h.lastSampleAt > overall24h.lastSampleAt)) {
      overall24h.lastSampleAt = r.trend24h.lastSampleAt;
    }
  }
  overall24h.avgMs = overall24h.requests ? Math.round(overall24h.avgMs / overall24h.requests) : 0;
  overall24h.errorRate = overall24h.requests ? Number((overall24h.failures / overall24h.requests).toFixed(4)) : 0;
  overall24h.p95Ms = percentile(allP95.sort((a, b) => a - b), 95);

  const run = runs?.[0] ?? null;

  return {
    generatedAt: new Date().toISOString(),
    target,
    routes,
    monitoredCount: monitored.length,
    failingCount: routes.filter((r) => r.last_status === "failed").length,
    neverCheckedCount: routes.filter((r) => r.last_status === "unknown").length,
    staleCount: routes.filter((r) => r.stale && r.last_status !== "unknown").length,
    overall24h,

    lastRun: run
      ? {
          startedAt: run.started_at,
          finishedAt: run.finished_at,
          status: run.status,
          source: run.source,
          requests: run.requests,
          failures: run.failures,
          slowestMs: run.slowest_ms,
        }
      : null,
  };
}
