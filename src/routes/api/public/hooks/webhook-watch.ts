/**
 * Webhook failure + spike watchdog.
 *
 * Runs every 5 minutes from pg_cron. Reads the unified delivery log
 * (ss_webhook_deliveries) for the last window and raises an on-call alert when:
 *
 *   1. failures, any 401 / 403 / 400-class / 5xx attempt appears, and either
 *      the failure count crosses `minFailures` or the failure rate crosses
 *      `threshold` percent of the window's traffic;
 *   2. spike, total attempts in the window are `spike`x the recent hourly
 *      baseline (and above `minSpike` calls), which catches retry storms and
 *      credential-stuffing style bursts against the public hook endpoints.
 *
 * Alerts dedupe per alert key through ss_webhook_alerts + a cooldown window so
 * one broken integration cannot text all afternoon.
 *
 * Public route, but guarded by the ops shared secret; no caller input is
 * persisted and no PII is returned.
 */
import { createFileRoute } from "@tanstack/react-router";

import { guardOpsHook } from "@/lib/ops-hook-auth.server";
import { sendOpsAlertEmail, sendOpsAlertSms } from "@/lib/ops-alert.server";

const WINDOW_MINUTES = 15;
const BASELINE_HOURS = 6;
const DEFAULT_THRESHOLD_PCT = 25;
const DEFAULT_MIN_FAILURES = 3;
const DEFAULT_SPIKE_FACTOR = 4;
const DEFAULT_MIN_SPIKE = 20;
const COOLDOWN_MINUTES = 30;

type Row = {
  channel: string;
  direction: string;
  endpoint: string | null;
  outcome: string;
  http_status: number | null;
  last_error: string | null;
  last_attempt_at: string;
};

type Alert = {
  key: string;
  type: "failure" | "spike";
  channel: string;
  subject: string;
  summary: string;
  sms: string;
  total: number;
  failed: number;
  rate: number;
  baseline: number | null;
};

function num(value: string | null, fallback: number): number {
  const n = value === null ? NaN : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function isFailure(row: Row): boolean {
  if (row.outcome === "failed") return true;
  const s = row.http_status;
  return typeof s === "number" && s >= 400;
}

async function runWatch(request: Request): Promise<Response> {
  const denied = guardOpsHook(request, "webhook-watch");
  if (denied) return denied;

  const params = new URL(request.url).searchParams;
  const windowMin = Math.max(5, num(params.get("window"), WINDOW_MINUTES));
  const thresholdPct = Math.min(100, Math.max(1, num(params.get("threshold"), DEFAULT_THRESHOLD_PCT)));
  const minFailures = Math.max(1, num(params.get("minFailures"), DEFAULT_MIN_FAILURES));
  const spikeFactor = Math.max(2, num(params.get("spike"), DEFAULT_SPIKE_FACTOR));
  const minSpike = Math.max(5, num(params.get("minSpike"), DEFAULT_MIN_SPIKE));
  const cooldownMin = Math.max(1, num(params.get("cooldown"), COOLDOWN_MINUTES));
  const dryRun = params.get("dryRun") === "1";

  const now = Date.now();
  const windowStart = new Date(now - windowMin * 60_000).toISOString();
  const baselineStart = new Date(now - BASELINE_HOURS * 3_600_000).toISOString();

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data, error } = await supabaseAdmin
    .from("ss_webhook_deliveries")
    .select("channel, direction, endpoint, outcome, http_status, last_error, last_attempt_at")
    .gte("last_attempt_at", baselineStart)
    .order("last_attempt_at", { ascending: false })
    .limit(5000);

  if (error) {
    console.error("[webhook-watch] query failed", error.message);
    return Response.json({ error: "query failed" }, { status: 500 });
  }

  const rows = (data ?? []) as Row[];
  const recent = rows.filter((r) => r.last_attempt_at >= windowStart);

  const channels = [..new Set(rows.map((r) => r.channel))];
  const alerts: Alert[] = [];

  for (const channel of channels) {
    const win = recent.filter((r) => r.channel === channel);
    const failures = win.filter(isFailure);
    const rate = win.length ? (failures.length / win.length) * 100 : 0;

    if (failures.length >= minFailures || (failures.length > 0 && rate >= thresholdPct)) {
      const byStatus = new Map<string, number>();
      for (const f of failures) {
        const k = f.http_status ? String(f.http_status) : "no status";
        byStatus.set(k, (byStatus.get(k) ?? 0) + 1);
      }
      const statusLine = [..byStatus.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([s, n]) => `${s}×${n}`)
        .join(", ");
      const sampleError = failures.find((f) => f.last_error)?.last_error ?? "no error text";
      const endpoints = [..new Set(failures.map((f) => f.endpoint).filter(Boolean))].slice(0, 3);

      alerts.push({
        key: `failure:${channel}`,
        type: "failure",
        channel,
        subject: `Savvy Swim: ${failures.length} webhook failures, ${channel}`,
        summary: [
          "Savvy Swim WEBHOOK FAILURE ALERT",
          `Channel: ${channel}`,
          `Window: last ${windowMin} minutes`,
          `Failures: ${failures.length} of ${win.length} attempts (${rate.toFixed(1)}%)`,
          `Statuses: ${statusLine || "n/a"}`,
          `Endpoints: ${endpoints.join(", ") || "n/a"}`,
          `Last error: ${sampleError.slice(0, 300)}`,
          "",
          "Review and retry: /admin/webhook-health",
        ].join("\n"),
        sms: `Savvy Swim: ${failures.length} ${channel} webhook failures in ${windowMin}m (${statusLine}). Check /admin/webhook-health.`,
        total: win.length,
        failed: failures.length,
        rate,
        baseline: null,
      });
    }

    // Spike: compare this window against the average window over the baseline.
    const older = rows.filter((r) => r.channel === channel && r.last_attempt_at < windowStart);
    const windowsInBaseline = Math.max(1, (BASELINE_HOURS * 60 - windowMin) / windowMin);
    const baseline = older.length / windowsInBaseline;
    if (win.length >= minSpike && win.length >= baseline * spikeFactor && baseline > 0) {
      alerts.push({
        key: `spike:${channel}`,
        type: "spike",
        channel,
        subject: `Savvy Swim: webhook traffic spike, ${channel}`,
        summary: [
          "Savvy Swim WEBHOOK SPIKE ALERT",
          `Channel: ${channel}`,
          `Window: last ${windowMin} minutes`,
          `Attempts: ${win.length} (baseline ${baseline.toFixed(1)} per ${windowMin}m over ${BASELINE_HOURS}h)`,
          `Multiplier: ${(win.length / baseline).toFixed(1)}x, threshold ${spikeFactor}x`,
          `Failures in window: ${failures.length}`,
          "",
          "Review: /admin/webhook-health",
        ].join("\n"),
        sms: `Savvy Swim: ${channel} webhook traffic spike, ${win.length} calls in ${windowMin}m (${(win.length / baseline).toFixed(1)}x normal).`,
        total: win.length,
        failed: failures.length,
        rate,
        baseline: Number(baseline.toFixed(2)),
      });
    }
  }

  const cutoff = new Date(now - cooldownMin * 60_000).toISOString();
  const results: { key: string; alerted: boolean; reason: string }[] = [];

  for (const alert of alerts) {
    const { data: prior } = await supabaseAdmin
      .from("ss_webhook_alerts")
      .select("id, last_alerted_at, alert_count")
      .eq("alert_key", alert.key)
      .maybeSingle();

    if (prior && prior.last_alerted_at > cutoff) {
      results.push({ key: alert.key, alerted: false, reason: "cooldown" });
      continue;
    }
    if (dryRun) {
      results.push({ key: alert.key, alerted: false, reason: "dryRun" });
      continue;
    }

    console.warn(
      JSON.stringify({
        tag: "webhook-alert",
        type: alert.type,
        channel: alert.channel,
        total: alert.total,
        failed: alert.failed,
        rate: Number(alert.rate.toFixed(2)),
        baseline: alert.baseline,
      }),
    );

    const [emailResult, smsResult] = await Promise.all([
      sendOpsAlertEmail(alert.subject, alert.summary, "webhook-alert"),
      sendOpsAlertSms(alert.sms),
    ]);
    const alertResult = `${emailResult}; ${smsResult}`;

    await supabaseAdmin.from("ss_webhook_alerts").upsert(
      {
        alert_key: alert.key,
        alert_type: alert.type,
        channel: alert.channel,
        summary: alert.summary,
        window_minutes: windowMin,
        total_events: alert.total,
        failed_events: alert.failed,
        failure_rate: Number(alert.rate.toFixed(2)),
        baseline: alert.baseline,
        alert_result: alertResult,
        alert_count: (prior?.alert_count ?? 0) + 1,
        last_alerted_at: new Date().toISOString(),
      },
      { onConflict: "alert_key" },
    );

    results.push({ key: alert.key, alerted: true, reason: alertResult });
  }

  return Response.json({
    ok: true,
    windowMinutes: windowMin,
    attempts: recent.length,
    channelsChecked: channels.length,
    alerts: results,
  });
}

export const Route = createFileRoute("/api/public/hooks/webhook-watch")({
  server: {
    handlers: {
      GET: ({ request }) => runWatch(request),
      POST: ({ request }) => runWatch(request),
    },
  },
});
