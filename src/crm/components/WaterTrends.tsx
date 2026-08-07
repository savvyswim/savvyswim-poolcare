import { useMemo, useState } from "react";
import { statusFor, type MetricKey, type Status } from "@/crm/lib/chem";

export type TrendVisit = {
  scheduled_date: string;
  minutes_on_site: number | null;
  readings: Record<string, number> | null;
  chem_cost: number | null;
};

const RANGES = [30, 90, 180] as const;

const money2 = (n: number) =>
  `$${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Series = { label: string; color: string; points: { x: string; y: number }[] };

/** Small multi-line sparkline — no chart library, keeps the customer card fast. */
function Spark({ series, unit }: { series: Series[]; unit?: string | undefined }) {
  const all = series.flatMap((s) => s.points.map((p) => p.y));
  if (!all.length) {
    return (
      <div className="flex h-[70px] items-center justify-center text-[0.7rem] opacity-45">
        No readings logged yet
      </div>
    );
  }
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const w = 240;
  const h = 70;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-[70px] w-full" preserveAspectRatio="none">
      {series.map((s) => {
        const n = s.points.length;
        const d = s.points
          .map((p, i) => {
            const x = n === 1 ? w / 2 : (i / (n - 1)) * w;
            const y = h - ((p.y - min) / span) * (h - 10) - 5;
            return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
          })
          .join(" ");
        return (
          <path key={s.label} d={d} fill="none" stroke={s.color} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />
        );
      })}
      <title>{`${min.toFixed(1)}–${max.toFixed(1)}${unit ? ` ${unit}` : ""}`}</title>
    </svg>
  );
}

function Panel({
  title,
  series,
  unit,
  latest,
  status,
}: {
  title: string;
  series: Series[];
  unit?: string | undefined;
  latest?: string | undefined;
  status?: Status | null | undefined;
}) {
  const dot =
    status === "low" || status === "high"
      ? "hsl(var(--ss-burgundy))"
      : status === "good"
        ? "hsl(var(--ss-aqua))"
        : "transparent";
  return (
    <div className="ss-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="ss-label">{title}</div>
        <div className="flex items-center gap-1.5">
          {status && status !== "unknown" && <span className="h-2 w-2 rounded-full" style={{ background: dot }} />}
          <span className="ss-num text-[0.85rem] font-bold">{latest ?? "—"}</span>
        </div>
      </div>
      <div className="mt-1 flex flex-wrap gap-2 text-[0.62rem] opacity-70">
        {series.map((s) => (
          <span key={s.label} className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="mt-1">
        <Spark series={series} unit={unit} />
      </div>
    </div>
  );
}

export default function WaterTrends({ visits }: { visits: TrendVisit[] }) {
  const [days, setDays] = useState<(typeof RANGES)[number]>(90);

  const rows = useMemo(() => {
    const cut = Date.now() - days * 86400000;
    return visits
      .filter((v) => new Date(v.scheduled_date).getTime() >= cut)
      .slice()
      .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
  }, [visits, days]);

  const chemCost = rows.reduce((s, v) => s + Number(v.chem_cost ?? 0), 0);

  const pick = (key: string, label: string, color: string): Series => ({
    label,
    color,
    points: rows
      .filter((v) => v.readings && typeof v.readings[key] === "number")
      .map((v) => ({ x: v.scheduled_date, y: Number(v.readings![key]) })),
  });

  const last = (key: string) => {
    for (let i = rows.length - 1; i >= 0; i--) {
      const val = rows[i]?.readings?.[key];
      if (typeof val === "number") return val;
    }
    return null;
  };

  const fmt = (key: string, unit = "") => {
    const v = last(key);
    return v == null ? "—" : `${v}${unit}`;
  };
  const st = (key: MetricKey) => {
    const v = last(key);
    return v == null ? null : statusFor(key, v);
  };

  const burgundy = "hsl(var(--ss-burgundy))";
  const aqua = "hsl(var(--ss-aqua))";

  const timeSeries: Series = {
    label: "Minutes",
    color: burgundy,
    points: rows
      .filter((v) => typeof v.minutes_on_site === "number")
      .map((v) => ({ x: v.scheduled_date, y: Number(v.minutes_on_site) })),
  };
  const avgMinutes = timeSeries.points.length
    ? Math.round(timeSeries.points.reduce((s, p) => s + p.y, 0) / timeSeries.points.length)
    : null;

  return (
    <div className="space-y-3">
      <div className="ss-card flex flex-wrap items-center justify-between gap-3 p-3">
        <div>
          <div className="ss-label">Chemical cost · last {days} days</div>
          <div className="ss-num text-[1.6rem] font-bold leading-none">{money2(chemCost)}</div>
          <div className="mt-1 text-[0.7rem] opacity-65">
            {rows.length} visit{rows.length === 1 ? "" : "s"} logged
          </div>
        </div>
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              className={`ss-btn ${days === r ? "" : "ss-btn-ghost"}`}
              onClick={() => setDays(r)}
            >
              {r} days
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <Panel
          title="Chlorine / pH"
          series={[pick("fc", "Free Cl", aqua), pick("ph", "pH", burgundy)]}
          latest={`${fmt("fc")} ppm · pH ${fmt("ph")}`}
          status={st("fc")}
        />
        <Panel
          title="Alkalinity / CYA"
          series={[pick("ta", "Alkalinity", aqua), pick("cyc", "CYA", burgundy)]}
          latest={`${fmt("ta")} / ${fmt("cyc")} ppm`}
          status={st("ta")}
        />
        <Panel
          title="Filter PSI"
          series={[pick("psi", "PSI", burgundy)]}
          unit="psi"
          latest={fmt("psi", " psi")}
          status={st("psi")}
        />
        <Panel
          title="Salt"
          series={[pick("salt", "Salt", aqua)]}
          unit="ppm"
          latest={fmt("salt", " ppm")}
          status={st("salt")}
        />
        <Panel
          title="Calcium hardness"
          series={[pick("ch", "Hardness", burgundy)]}
          unit="ppm"
          latest={fmt("ch", " ppm")}
          status={st("ch")}
        />
        <Panel
          title="Water temp"
          series={[pick("temp", "Temp", aqua)]}
          unit="°F"
          latest={fmt("temp", "°F")}
        />
        <Panel
          title="Time on site"
          series={[timeSeries]}
          unit="min"
          latest={avgMinutes == null ? "—" : `${avgMinutes} min avg`}
        />
      </div>
    </div>
  );
}
