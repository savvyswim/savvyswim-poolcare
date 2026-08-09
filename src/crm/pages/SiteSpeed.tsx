import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EmptyState, SectionTitle } from "@/crm/components/Brand";
import { useTable } from "@/crm/lib/useSavvy";
import { VITAL_THRESHOLDS, formatVital, vitalRating } from "@/lib/webVitals";

type Sample = {
  id: string;
  path: string;
  metric: string;
  value: number;
  device: string | null;
  created_at: string;
};

const METRICS = ["LCP", "FCP", "TTI", "CLS", "INP", "TTFB", "LOAD"] as const;
const RANGES = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const TONE: Record<string, string> = {
  good: "hsl(168 55% 32%)",
  "needs-work": "hsl(38 80% 40%)",
  poor: "hsl(var(--ss-brand))",
};

function p75(values: number[]): number | null {
  if (!values.length) return null;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(s.length * 0.75))]!;
}

export default function SiteSpeed() {
  const [days, setDays] = useState(30);
  const [path, setPath] = useState("/");

  const { rows, loading } = useTable<Sample>(`web-vitals-${days}`, async () => {
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const { data } = await supabase
      .from("web_vitals")
      .select("id,path,metric,value,device,created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000);
    return (data ?? []) as Sample[];
  });

  const paths = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r.path] = (counts[r.path] ?? 0) + 1;
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([p]) => p);
  }, [rows]);

  const scoped = useMemo(
    () => rows.filter((r) => r.path === path),
    [rows, path],
  );

  const cutoff = useMemo(() => Date.now() - days * 86400000, [days]);
  const prevCutoff = useMemo(() => Date.now() - days * 2 * 86400000, [days]);

  const summary = useMemo(() => {
    return METRICS.map((metric) => {
      const inWindow = scoped.filter(
        (r) => r.metric === metric && new Date(r.created_at).getTime() >= cutoff,
      );
      const prior = scoped.filter((r) => {
        const t = new Date(r.created_at).getTime();
        return r.metric === metric && t < cutoff && t >= prevCutoff;
      });
      const current = p75(inWindow.map((r) => Number(r.value)));
      const previous = p75(prior.map((r) => Number(r.value)));
      const delta =
        current !== null && previous !== null && previous > 0
          ? Math.round(((current - previous) / previous) * 100)
          : null;
      return { metric, current, previous, delta, samples: inWindow.length };
    });
  }, [scoped, cutoff, prevCutoff]);

  const daily = useMemo(() => {
    const byDay: Record<string, Record<string, number[]>> = {};
    for (const r of scoped) {
      const t = new Date(r.created_at).getTime();
      if (t < cutoff) continue;
      const day = r.created_at.slice(0, 10);
      byDay[day] ??= {};
      (byDay[day][r.metric] ??= []).push(Number(r.value));
    }
    return Object.entries(byDay)
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .slice(0, 14)
      .map(([day, metrics]) => ({
        day,
        lcp: p75(metrics["LCP"] ?? []),
        cls: p75(metrics["CLS"] ?? []),
        inp: p75(metrics["INP"] ?? []),
        tti: p75(metrics["TTI"] ?? []),
        load: p75(metrics["LOAD"] ?? []),
        samples: Object.values(metrics).reduce((s, v) => s + v.length, 0),
      }));
  }, [scoped, cutoff]);

  const regressions = summary.filter((s) => s.delta !== null && s.delta > 15);

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Site speed · real visitor performance"
        sub="Core Web Vitals measured on real devices (75th percentile). Lower is better."
        right={
          <div className="flex flex-wrap items-center gap-1.5">
            <select
              aria-label="Page"
              className="ss-input"
              value={path}
              onChange={(e) => setPath(e.target.value)}
            >
              {(paths.length ? paths : ["/"]).map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                onClick={() => setDays(r.days)}
                className="ss-chip"
                style={days === r.days ? { background: "hsl(var(--ss-brand))", color: "white" } : undefined}
              >
                {r.label}
              </button>
            ))}
          </div>
        }
      />

      {loading && <div className="ss-card p-4 text-[0.85rem] opacity-70">Loading measurements…</div>}

      {!loading && !scoped.length && (
        <EmptyState>
          No measurements yet — samples appear here as visitors load the site.
        </EmptyState>
      )}


      {!!scoped.length && (
        <>
          {!!regressions.length && (
            <div
              className="ss-card p-3 text-[0.82rem]"
              style={{ borderColor: "hsl(var(--ss-brand))" }}
            >
              <div className="ss-label" style={{ color: "hsl(var(--ss-brand))" }}>
                Regression detected
              </div>
              <div className="mt-1">
                {regressions
                  .map((r) => `${r.metric} is ${r.delta}% slower than the previous ${days} days`)
                  .join(" · ")}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {summary.map((s) => {
              const t = VITAL_THRESHOLDS[s.metric]!;
              const rating = s.current !== null ? vitalRating(s.metric, s.current) : "good";
              return (
                <div key={s.metric} className="ss-card p-3">
                  <div className="ss-tag">{s.metric}</div>
                  <div className="text-[0.7rem] opacity-60">{t.label}</div>
                  <div
                    className="ss-num mt-1 text-[1.4rem] font-bold leading-none"
                    style={{ color: s.current !== null ? TONE[rating] : undefined }}
                  >
                    {s.current !== null ? formatVital(s.metric, s.current) : "—"}
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[0.68rem] opacity-70">
                    <span>{s.samples} samples</span>
                    {s.delta !== null && (
                      <span style={{ color: s.delta > 15 ? "hsl(var(--ss-brand))" : undefined }}>
                        {s.delta > 0 ? "+" : ""}
                        {s.delta}% vs prior
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="ss-card p-3">
            <div className="ss-label mb-2">Daily trend (75th percentile)</div>
            <div className="-mx-3 overflow-x-auto px-3">
              <table className="w-full min-w-[560px] text-[0.8rem]">
                <thead>
                  <tr className="ss-label [&>th]:whitespace-nowrap">
                    <th className="p-1.5 text-left">Day</th>
                    <th className="p-1.5 text-right">LCP</th>
                    <th className="p-1.5 text-right">CLS</th>
                    <th className="p-1.5 text-right">INP</th>
                    <th className="p-1.5 text-right">TTI</th>
                    <th className="p-1.5 text-right">Load</th>
                    <th className="p-1.5 text-right">Samples</th>
                  </tr>
                </thead>
                <tbody>
                  {daily.map((d) => (
                    <tr key={d.day} style={{ borderTop: "1px solid hsl(var(--ss-sand))" }}>
                      <td className="p-1.5 font-semibold">{d.day}</td>
                      {(["LCP", "CLS", "INP", "TTI", "LOAD"] as const).map((m) => {
                        const v =
                          m === "LCP"
                            ? d.lcp
                            : m === "CLS"
                              ? d.cls
                              : m === "INP"
                                ? d.inp
                                : m === "TTI"
                                  ? d.tti
                                  : d.load;
                        return (
                          <td
                            key={m}
                            className="ss-num p-1.5 text-right"
                            style={{ color: v !== null ? TONE[vitalRating(m, v)] : undefined }}
                          >
                            {v !== null ? formatVital(m, v) : "—"}
                          </td>
                        );
                      })}
                      <td className="ss-num p-1.5 text-right opacity-70">{d.samples}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
