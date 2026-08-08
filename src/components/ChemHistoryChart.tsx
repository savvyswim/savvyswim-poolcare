import { useMemo, useState } from "react";

export type ChemRow = { date: string; readings: Record<string, number | null> };

export const CHEM_PARAMS: { key: string; label: string; unit: string; target?: [number, number] }[] = [
  { key: "fc", label: "Chlorine", unit: "ppm", target: [2, 4] },
  { key: "ph", label: "pH", unit: "", target: [7.4, 7.6] },
  { key: "ta", label: "Alkalinity", unit: "ppm", target: [80, 120] },
  { key: "cyc", label: "CYA", unit: "ppm", target: [30, 50] },
  { key: "salt", label: "Salt", unit: "ppm", target: [2700, 3400] },
  { key: "ch", label: "Calcium", unit: "ppm", target: [200, 400] },
  { key: "temp", label: "Water temp", unit: "°F" },
  { key: "psi", label: "Filter PSI", unit: "psi", target: [10, 20] },
];

const RANGES = [30, 60, 90] as const;

/** Shared chemistry trend chart used by the CRM and the customer portal. */
export default function ChemHistoryChart({
  rows,
  days,
  onDays,
  loading,
}: {
  rows: ChemRow[];
  days: number;
  onDays: (d: number) => void;
  loading?: boolean;
}) {
  const [param, setParam] = useState(CHEM_PARAMS[0]!.key);
  const active = CHEM_PARAMS.find((p) => p.key === param) ?? CHEM_PARAMS[0]!;

  const points = useMemo(
    () =>
      rows
        .map((r) => ({ date: r.date, value: Number(r.readings?.[param] ?? NaN) }))
        .filter((p) => Number.isFinite(p.value)),
    [rows, param],
  );

  const latest = points[points.length - 1];
  const width = 640;
  const height = 180;
  const pad = 8;

  const path = useMemo(() => {
    if (points.length < 2) return "";
    const values = points.map((p) => p.value);
    const lo = Math.min(...values, ...(active.target ?? []));
    const hi = Math.max(...values, ...(active.target ?? []));
    const span = hi - lo || 1;
    return points
      .map((p, i) => {
        const x = pad + (i / (points.length - 1)) * (width - pad * 2);
        const y = height - pad - ((p.value - lo) / span) * (height - pad * 2);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");
  }, [points, active.target]);

  return (
    <div className="border border-primary/15">
      <div className="flex flex-wrap items-center gap-2 border-b border-primary/15 px-3 py-2">
        <h3 className="font-tech text-[11px] uppercase tracking-[0.2em] text-primary">Chemical history</h3>
        <span className="flex-1" />
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onDays(r)}
            className={`px-2 py-1 font-tech text-[10px] uppercase tracking-wide ${
              days === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-accent"
            }`}
          >
            {r} days
          </button>
        ))}
      </div>

      <div className="px-3 pt-3">
        <p className="font-display text-lg uppercase tracking-tight text-foreground">{active.label}</p>
        <p className="font-tech text-xs text-muted-foreground">
          {loading
            ? "Loading readings…"
            : latest
              ? `${latest.value} ${active.unit} · ${new Date(`${latest.date}T12:00:00`).toLocaleDateString()}`
              : "No reading entered yet"}
          {active.target ? ` · target ${active.target[0]}–${active.target[1]} ${active.unit}` : ""}
        </p>
      </div>

      <div className="px-3 py-3">
        {points.length < 2 ? (
          <div className="flex h-[180px] items-center justify-center font-tech text-xs uppercase tracking-wide text-muted-foreground">
            No chemical history found for this range
          </div>
        ) : (
          <svg viewBox={`0 0 ${width} ${height}`} className="h-[180px] w-full" role="img"
            aria-label={`${active.label} trend over the last ${days} days`}>
            <path d={path} fill="none" stroke="hsl(var(--accent))" strokeWidth={2} />
            {points.map((p, i) => {
              const x = pad + (i / (points.length - 1)) * (width - pad * 2);
              const values = points.map((q) => q.value);
              const lo = Math.min(...values, ...(active.target ?? []));
              const hi = Math.max(...values, ...(active.target ?? []));
              const span = hi - lo || 1;
              const y = height - pad - ((p.value - lo) / span) * (height - pad * 2);
              const off = active.target && (p.value < active.target[0] || p.value > active.target[1]);
              return (
                <circle key={p.date + i} cx={x} cy={y} r={3.5}
                  fill={off ? "hsl(var(--destructive))" : "hsl(var(--accent))"} />
              );
            })}
          </svg>
        )}
      </div>

      <div className="flex flex-wrap gap-1 border-t border-primary/15 p-2">
        {CHEM_PARAMS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setParam(p.key)}
            className={`px-2 py-1 font-tech text-[10px] uppercase tracking-wide ${
              param === p.key ? "bg-accent text-accent-foreground" : "text-primary hover:text-accent"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}
