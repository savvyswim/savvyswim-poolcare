import { useMemo, useState } from "react";

export type InspectionAnalyticsRow = {
  status: string;
  utm_source: string | null;
  utm_campaign: string | null;
  created_at: string;
};

const RANGES = [
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
  { key: "all", label: "All time", days: 0 },
] as const;

const SCHEDULED = new Set(["scheduled", "won"]);

function sourceOf(r: InspectionAnalyticsRow) {
  const s = (r.utm_source ?? "").trim().toLowerCase();
  if (!s) return "direct / referral";
  return s;
}

export default function InspectionSourceAnalytics({ rows }: { rows: InspectionAnalyticsRow[] }) {
  const [range, setRange] = useState<string>("90");

  const scoped = useMemo(() => {
    const cfg = RANGES.find((r) => r.key === range);
    if (!cfg || cfg.days === 0) return rows;
    const cutoff = Date.now() - cfg.days * 86400000;
    return rows.filter((r) => new Date(r.created_at).getTime() >= cutoff);
  }, [rows, range]);

  const stats = useMemo(() => {
    const map = new Map<
      string,
      { source: string; total: number; scheduled: number; won: number; lost: number }
    >();
    for (const r of scoped) {
      const key = sourceOf(r);
      const cur =
        map.get(key) ?? { source: key, total: 0, scheduled: 0, won: 0, lost: 0 };
      cur.total += 1;
      if (SCHEDULED.has(r.status)) cur.scheduled += 1;
      if (r.status === "won") cur.won += 1;
      if (r.status === "lost") cur.lost += 1;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.total - a.total || a.source.localeCompare(b.source));
  }, [scoped]);

  const total = scoped.length;
  const scheduledTotal = scoped.filter((r) => SCHEDULED.has(r.status)).length;
  const rate = total ? Math.round((scheduledTotal / total) * 100) : 0;
  const best = stats.filter((s) => s.total >= 2).sort((a, b) => b.scheduled / b.total - a.scheduled / a.total)[0];
  const max = stats[0]?.total ?? 1;

  return (
    <div className="ss-card space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="text-[0.7rem] uppercase tracking-[0.18em] opacity-60">
          Lead source performance
        </div>
        <div className="ml-auto flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.key}
              className="ss-btn"
              style={range === r.key ? undefined : { opacity: 0.55 }}
              onClick={() => setRange(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border border-current/15 p-3">
          <div className="text-[0.65rem] uppercase tracking-[0.16em] opacity-60">Requests</div>
          <div className="text-2xl font-semibold">{total}</div>
        </div>
        <div className="border border-current/15 p-3">
          <div className="text-[0.65rem] uppercase tracking-[0.16em] opacity-60">
            Scheduled inspections
          </div>
          <div className="text-2xl font-semibold">{scheduledTotal}</div>
        </div>
        <div className="border border-current/15 p-3">
          <div className="text-[0.65rem] uppercase tracking-[0.16em] opacity-60">
            Conversion rate
          </div>
          <div className="text-2xl font-semibold">{rate}%</div>
          <div className="text-[0.7rem] opacity-60">
            {best ? `Best source: ${best.source}` : "Not enough data yet"}
          </div>
        </div>
      </div>

      {stats.length === 0 ? (
        <div className="text-[0.85rem] opacity-70">No requests in this period.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[0.85rem]">
            <thead>
              <tr className="text-left text-[0.65rem] uppercase tracking-[0.16em] opacity-60">
                <th className="py-2 pr-3">Source</th>
                <th className="py-2 pr-3">Requests</th>
                <th className="py-2 pr-3">Scheduled</th>
                <th className="py-2 pr-3">Won</th>
                <th className="py-2 pr-3">Lost</th>
                <th className="py-2">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => {
                const pct = s.total ? Math.round((s.scheduled / s.total) * 100) : 0;
                return (
                  <tr key={s.source} className="border-t border-current/10">
                    <td className="py-2 pr-3">
                      <div>{s.source}</div>
                      <div className="mt-1 h-1 w-32 bg-current/10">
                        <div
                          className="h-1 bg-current/60"
                          style={{ width: `${Math.max(4, (s.total / max) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-3">{s.total}</td>
                    <td className="py-2 pr-3">{s.scheduled}</td>
                    <td className="py-2 pr-3">{s.won}</td>
                    <td className="py-2 pr-3">{s.lost}</td>
                    <td className="py-2 font-semibold">{pct}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
