import { useMemo } from "react";

export type InspectionAnalyticsRow = {
  status: string;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium?: string | null;
  landing_page?: string | null;
  page_path?: string | null;
  created_at: string;
};

export const RANGES = [
  { key: "30", label: "Last 30 days", days: 30 },
  { key: "90", label: "Last 90 days", days: 90 },
  { key: "all", label: "All time", days: 0 },
] as const;

const SCHEDULED = new Set(["scheduled", "won"]);
// Anything past first contact counts as contacted for the funnel.
const CONTACTED = new Set(["contacted", "scheduled", "won", "lost"]);

export function sourceOf(r: { utm_source: string | null }) {
  const s = (r.utm_source ?? "").trim().toLowerCase();
  return s || "direct / referral";
}

/** Landing page (first page of the session), falling back to the form page. */
export function pageOf(r: { landing_page?: string | null; page_path?: string | null }) {
  const raw = (r.landing_page ?? r.page_path ?? "").trim();
  if (!raw) return "unknown";
  return raw.split("?")[0] || "/";
}

export function inRange(iso: string, rangeKey: string) {
  const cfg = RANGES.find((r) => r.key === rangeKey);
  if (!cfg || cfg.days === 0) return true;
  return new Date(iso).getTime() >= Date.now() - cfg.days * 86400000;
}

type Props = {
  rows: InspectionAnalyticsRow[];
  range: string;
  onRangeChange: (r: string) => void;
  activeSource: string | null;
  onSelectSource: (s: string | null) => void;
  activeLanding?: string | null;
  onSelectLanding?: (p: string | null) => void;
};


export default function InspectionSourceAnalytics({
  rows,
  range,
  onRangeChange,
  activeSource,
  onSelectSource,
  activeLanding = null,
  onSelectLanding,
}: Props) {
  const scoped = useMemo(() => rows.filter((r) => inRange(r.created_at, range)), [rows, range]);

  const pages = useMemo(() => {
    const m = new Map<string, { page: string; total: number; scheduled: number }>();
    for (const r of scoped) {
      const key = pageOf(r);
      const cur = m.get(key) ?? { page: key, total: 0, scheduled: 0 };
      cur.total += 1;
      if (SCHEDULED.has(r.status)) cur.scheduled += 1;
      m.set(key, cur);
    }
    return [...m.values()].sort((a, b) => b.total - a.total).slice(0, 6);
  }, [scoped]);

  const mediums = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of scoped) {
      const key = (r.utm_medium ?? "").trim().toLowerCase() || "none";
      m.set(key, (m.get(key) ?? 0) + 1);
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [scoped]);



  const stats = useMemo(() => {
    const map = new Map<
      string,
      {
        source: string;
        total: number;
        contacted: number;
        scheduled: number;
        completed: number;
        lost: number;
      }
    >();
    for (const r of scoped) {
      const key = sourceOf(r);
      const cur =
        map.get(key) ??
        { source: key, total: 0, contacted: 0, scheduled: 0, completed: 0, lost: 0 };
      cur.total += 1;
      if (CONTACTED.has(r.status)) cur.contacted += 1;
      if (SCHEDULED.has(r.status)) cur.scheduled += 1;
      if (r.status === "won") cur.completed += 1;
      if (r.status === "lost") cur.lost += 1;
      map.set(key, cur);
    }
    return [...map.values()].sort((a, b) => b.total - a.total || a.source.localeCompare(b.source));
  }, [scoped]);

  const total = scoped.length;
  const contactedTotal = scoped.filter((r) => CONTACTED.has(r.status)).length;
  const scheduledTotal = scoped.filter((r) => SCHEDULED.has(r.status)).length;
  const completedTotal = scoped.filter((r) => r.status === "won").length;
  const rate = total ? Math.round((scheduledTotal / total) * 100) : 0;
  const best = stats
    .filter((s) => s.total >= 2)
    .sort((a, b) => b.scheduled / b.total - a.scheduled / a.total)[0];
  const max = stats[0]?.total ?? 1;

  const funnel = [
    { label: "Requests", value: total },
    { label: "Contacted", value: contactedTotal },
    { label: "Scheduled", value: scheduledTotal },
    { label: "Completed", value: completedTotal },
  ];

  // Biggest leak per source: the stage that loses the most requests.
  const leaks = stats
    .filter((s) => s.total >= 2)
    .map((s) => {
      const steps = [
        { stage: "never contacted", lost: s.total - s.contacted },
        { stage: "contacted, never scheduled", lost: s.contacted - s.scheduled },
        { stage: "scheduled, not completed", lost: s.scheduled - s.completed },
      ];
      const worst = steps.sort((a, b) => b.lost - a.lost)[0]!;
      return { source: s.source, ...worst, pct: Math.round((worst.lost / s.total) * 100) };
    })
    .filter((l) => l.lost > 0)
    .sort((a, b) => b.lost - a.lost)
    .slice(0, 3);

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
              onClick={() => onRangeChange(r.key)}
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

      <div className="space-y-2">
        <div className="text-[0.65rem] uppercase tracking-[0.16em] opacity-60">Funnel</div>
        <div className="grid gap-2 sm:grid-cols-4">
          {funnel.map((f, i) => {
            const prev = i === 0 ? f.value : funnel[i - 1]!.value;
            const step = prev ? Math.round((f.value / prev) * 100) : 0;
            const overall = total ? Math.round((f.value / total) * 100) : 0;
            return (
              <div key={f.label} className="border border-current/15 p-3">
                <div className="text-[0.65rem] uppercase tracking-[0.16em] opacity-60">
                  {f.label}
                </div>
                <div className="text-xl font-semibold">{f.value}</div>
                <div className="mt-1 h-1 w-full bg-current/10">
                  <div className="h-1 bg-current/60" style={{ width: `${overall}%` }} />
                </div>
                <div className="mt-1 text-[0.7rem] opacity-60">
                  {i === 0 ? "100% of requests" : `${step}% of previous · ${overall}% overall`}
                </div>
              </div>
            );
          })}
        </div>
        {leaks.length > 0 && (
          <div className="text-[0.75rem] opacity-75">
            Biggest drop-off:{" "}
            {leaks.map((l, i) => (
              <span key={l.source}>
                {i > 0 ? " · " : ""}
                <button className="underline" onClick={() => onSelectSource(l.source)}>
                  {l.source}
                </button>{" "}
                — {l.lost} {l.stage} ({l.pct}%)
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="border border-current/15 p-3">
          <div className="mb-2 text-[0.65rem] uppercase tracking-[0.16em] opacity-60">
            Landing page
          </div>
          {pages.length === 0 ? (
            <div className="text-[0.8rem] opacity-70">No data yet.</div>
          ) : (
            <div className="space-y-1">
              {pages.map((p) => {
                const active = activeLanding === p.page;
                return (
                  <button
                    key={p.page}
                    className="flex w-full items-center justify-between gap-3 text-left text-[0.8rem] hover:underline"
                    style={active ? { fontWeight: 700 } : undefined}
                    onClick={() => onSelectLanding?.(active ? null : p.page)}
                  >
                    <span className="truncate">{p.page}</span>
                    <span className="whitespace-nowrap opacity-70">
                      {p.total} · {p.total ? Math.round((p.scheduled / p.total) * 100) : 0}%
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border border-current/15 p-3">
          <div className="mb-2 text-[0.65rem] uppercase tracking-[0.16em] opacity-60">
            Campaign medium
          </div>
          {mediums.length === 0 ? (
            <div className="text-[0.8rem] opacity-70">No data yet.</div>
          ) : (
            <div className="space-y-1">
              {mediums.map(([m, n]) => (
                <div key={m} className="flex items-center justify-between text-[0.8rem]">
                  <span>{m}</span>
                  <span className="opacity-70">{n}</span>
                </div>
              ))}
            </div>
          )}
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
                <th className="py-2 pr-3">Contacted</th>
                <th className="py-2 pr-3">Scheduled</th>
                <th className="py-2 pr-3">Completed</th>
                <th className="py-2 pr-3">Lost</th>
                <th className="py-2">Conversion</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => {
                const pct = s.total ? Math.round((s.scheduled / s.total) * 100) : 0;
                const active = activeSource === s.source;
                return (
                  <tr
                    key={s.source}
                    className="cursor-pointer border-t border-current/10 hover:bg-current/5"
                    style={active ? { background: "rgba(31,169,190,0.14)" } : undefined}
                    onClick={() => onSelectSource(active ? null : s.source)}
                    title="Show these requests in the list below"
                  >
                    <td className="py-2 pr-3">
                      <div className="underline-offset-2 hover:underline">{s.source}</div>
                      <div className="mt-1 h-1 w-32 bg-current/10">
                        <div
                          className="h-1 bg-current/60"
                          style={{ width: `${Math.max(4, (s.total / max) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="py-2 pr-3">{s.total}</td>
                    <td className="py-2 pr-3">{s.contacted}</td>
                    <td className="py-2 pr-3">{s.scheduled}</td>
                    <td className="py-2 pr-3">{s.completed}</td>
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
