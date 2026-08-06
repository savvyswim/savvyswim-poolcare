import { useMemo, useState } from "react";
import { Beaker, Droplets, FlaskConical } from "lucide-react";
import { Chip, EmptyState, SectionTitle, StatTile } from "@/crm/components/Brand";
import { evaluate, lsiVerdict, type Readings } from "@/crm/lib/chem";
import {
  ALGAE_GUIDE,
  REFERENCE_PARAMS,
  SHOCK_TABLE,
  phosphateAdvice,
  shockFor,
  tdsAdvice,
} from "@/crm/lib/chemReference";

const FIELDS = [
  { key: "gallons", label: "Pool size", unit: "gal", step: 500 },
  { key: "fc", label: "Free chlorine", unit: "ppm", step: 0.1 },
  { key: "ph", label: "pH", unit: "", step: 0.1 },
  { key: "ta", label: "Total alkalinity", unit: "ppm", step: 10 },
  { key: "ch", label: "Calcium hardness", unit: "ppm", step: 10 },
  { key: "cyc", label: "CYA / stabilizer", unit: "ppm", step: 5 },
  { key: "salt", label: "Salt (SWG)", unit: "ppm", step: 100 },
  { key: "psi", label: "Filter PSI", unit: "psi", step: 1 },
  { key: "temp", label: "Water temp", unit: "°F", step: 1 },
  { key: "phos", label: "Phosphates", unit: "ppb", step: 50 },
  { key: "tds", label: "Total dissolved solids", unit: "ppm", step: 100 },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

const STATUS_STYLE: Record<string, { bg: string; border: string; label: string }> = {
  good: { bg: "hsl(var(--ss-aqua) / 0.12)", border: "hsl(var(--ss-aqua) / 0.45)", label: "In range" },
  low: { bg: "hsl(var(--ss-gold) / 0.16)", border: "hsl(var(--ss-gold) / 0.5)", label: "Low" },
  high: { bg: "hsl(var(--ss-gold) / 0.16)", border: "hsl(var(--ss-gold) / 0.5)", label: "High" },
  unknown: { bg: "transparent", border: "hsl(0 0% 0% / 0.12)", label: "Not tested" },
};

export default function WaterLab() {
  const [vals, setVals] = useState<Partial<Record<FieldKey, string>>>({ gallons: "15000" });

  const num = (k: FieldKey) => {
    const raw = vals[k];
    if (raw === undefined || raw.trim() === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  };

  const gallons = num("gallons") ?? 0;
  const readings: Readings = {
    fc: num("fc"),
    ph: num("ph"),
    ta: num("ta"),
    ch: num("ch"),
    cyc: num("cyc"),
    salt: num("salt"),
    psi: num("psi"),
    temp: num("temp"),
  };

  const result = useMemo(() => evaluate(readings, gallons), [JSON.stringify(readings), gallons]);
  const saltPool = (num("salt") ?? 0) > 0;
  const phos = phosphateAdvice(num("phos"));
  const tds = tdsAdvice(num("tds"), saltPool);
  const shock = shockFor(gallons);
  const lsiV = lsiVerdict(result.lsi);

  const extraActions = [phos, tds].filter((a) => a && a.status === "high") as { status: string; text: string }[];
  const actionCount = result.treatments.length + extraActions.length;
  const anyTested = result.tested.length > 0 || phos || tds;

  const reset = () => setVals({ gallons: vals.gallons ?? "15000" });

  return (
    <div className="space-y-6">
      <SectionTitle
        title="Water Lab"
        sub="Put the numbers in — the lab tells you exactly what the pool needs. Know the ranges. Know the fixes. Never guess."
        right={
          <button onClick={reset} className="ss-chip">
            Clear readings
          </button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_1fr]">
        {/* Entry */}
        <div className="ss-card p-3">
          <div className="mb-2 flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.14em] opacity-60">
            <FlaskConical size={14} /> Test readings
          </div>
          <div className="grid grid-cols-2 gap-2">
            {FIELDS.map((f) => (
              <label key={f.key} className="block">
                <span className="block text-[0.68rem] uppercase tracking-[0.1em] opacity-60">
                  {f.label}
                  {f.unit ? ` (${f.unit})` : ""}
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  step={f.step}
                  value={vals[f.key] ?? ""}
                  onChange={(e) => setVals((v) => ({ ...v, [f.key]: e.target.value }))}
                  placeholder="—"
                  className="ss-input mt-1 w-full rounded-md border px-2 py-1.5 text-[1rem] font-semibold"
                  style={{ borderColor: "hsl(0 0% 0% / 0.14)", background: "hsl(var(--ss-cream, 0 0% 100%))" }}
                />
              </label>
            ))}
          </div>
        </div>

        {/* Verdict */}
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            <StatTile tone="hero" label="Actions needed" value={String(actionCount)} />
            <StatTile label="Levels tested" value={String(result.tested.length)} />
            <StatTile label="Out of range" value={String(result.outOfRange.length)} />
            <StatTile label="LSI" value={result.lsi == null ? "—" : `${result.lsi} · ${lsiV.label}`} />
          </div>

          {!anyTested ? (
            <EmptyState>Enter the readings on the left and the fixes appear here instantly.</EmptyState>
          ) : (
            <div
              className="ss-card p-3"
              style={
                actionCount === 0
                  ? { background: "hsl(var(--ss-aqua) / 0.12)", borderColor: "hsl(var(--ss-aqua) / 0.45)" }
                  : { background: "hsl(var(--ss-gold) / 0.14)", borderColor: "hsl(var(--ss-gold) / 0.5)" }
              }
            >
              <div className="flex items-center gap-2 text-[0.85rem] font-semibold">
                <Droplets size={16} />
                {actionCount === 0
                  ? "All tested levels are in range — water is balanced and swim-ready."
                  : `${actionCount} correction${actionCount === 1 ? "" : "s"} needed on this pool.`}
              </div>
            </div>
          )}

          {(result.treatments.length > 0 || extraActions.length > 0) && (
            <div className="space-y-2">
              {result.treatments.map((t) => (
                <div key={t.metric + t.chemical} className="ss-card p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="text-[0.95rem] font-semibold">{t.chemical}</div>
                    <div className="ss-num text-[1.25rem] font-bold leading-none">{t.amount}</div>
                  </div>
                  <div className="mt-1 text-[0.78rem] opacity-70">{t.reason}</div>
                </div>
              ))}
              {extraActions.map((a) => (
                <div key={a.text} className="ss-card p-3">
                  <div className="text-[0.78rem]">{a.text}</div>
                </div>
              ))}
            </div>
          )}

          {/* Per-parameter readout */}
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {result.metrics.map((m) => {
              const s = STATUS_STYLE[m.status];
              return (
                <div
                  key={m.key}
                  className="ss-card p-3"
                  style={{ background: s.bg, borderColor: s.border }}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="text-[0.8rem] font-semibold">{m.label}</div>
                    <div className="ss-num text-[1.1rem] font-bold leading-none">
                      {m.value ?? "—"}
                      {m.value != null && m.unit ? <span className="text-[0.7rem] opacity-60"> {m.unit}</span> : null}
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between gap-2 text-[0.7rem] opacity-70">
                    <span>Target {m.range}</span>
                    <span>{s.label}</span>
                  </div>
                </div>
              );
            })}
            {[phos, tds].map((a, i) =>
              a ? (
                <div
                  key={i}
                  className="ss-card p-3"
                  style={
                    a.status === "good"
                      ? { background: STATUS_STYLE.good.bg, borderColor: STATUS_STYLE.good.border }
                      : { background: STATUS_STYLE.high.bg, borderColor: STATUS_STYLE.high.border }
                  }
                >
                  <div className="text-[0.8rem] font-semibold">{i === 0 ? "Phosphates" : "Total dissolved solids"}</div>
                  <div className="mt-1 text-[0.7rem] opacity-75">{a.text}</div>
                </div>
              ) : null,
            )}
          </div>

          {shock && (
            <div className="ss-card p-3">
              <div className="mb-1 flex items-center gap-2 text-[0.72rem] uppercase tracking-[0.14em] opacity-60">
                <Beaker size={14} /> Shock dose for {shock.label}
              </div>
              <div className="flex flex-wrap gap-2 text-[0.8rem]">
                <Chip>Regular: {shock.regular}</Chip>
                <Chip>Super (algae): {shock.super}</Chip>
                <Chip>Liquid chlorine: {shock.liquid}</Chip>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reference tables */}
      <div>
        <SectionTitle title="Target ranges & corrections" sub="Core parameters — what to add when it's low, what to do when it's high." />
        <div className="ss-card overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[0.78rem]">
            <thead>
              <tr className="uppercase tracking-[0.1em] opacity-60">
                <th className="p-2">Parameter</th>
                <th className="p-2">Ideal range</th>
                <th className="p-2">Low — add this</th>
                <th className="p-2">High — do this</th>
                <th className="p-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {REFERENCE_PARAMS.map((p) => (
                <tr key={p.key} className="border-t" style={{ borderColor: "hsl(0 0% 0% / 0.08)" }}>
                  <td className="p-2 font-semibold">{p.label}</td>
                  <td className="ss-num p-2">{p.range}</td>
                  <td className="p-2">{p.low}</td>
                  <td className="p-2">{p.high}</td>
                  <td className="p-2 opacity-70">{p.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <SectionTitle title="Algae treatment quick guide" />
        <div className="grid gap-2 md:grid-cols-3">
          {ALGAE_GUIDE.map((a) => (
            <div key={a.type} className="ss-card p-3">
              <div className="text-[0.9rem] font-semibold">{a.type}</div>
              <div className="mt-1 text-[0.75rem] opacity-70">{a.appearance}</div>
              <div className="mt-2 text-[0.78rem]">
                <strong>Cause:</strong> {a.cause}
              </div>
              <div className="mt-1 text-[0.78rem]">
                <strong>Treatment:</strong> {a.treatment}
              </div>
              <div className="mt-1 text-[0.78rem] opacity-70">
                <strong>Prevention:</strong> {a.prevention}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle title="Shock dosing quick reference" />
        <div className="ss-card overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-[0.78rem]">
            <thead>
              <tr className="uppercase tracking-[0.1em] opacity-60">
                <th className="p-2">Pool size</th>
                <th className="p-2">Regular shock</th>
                <th className="p-2">Super shock (algae)</th>
                <th className="p-2">Liquid chlorine</th>
                <th className="p-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {SHOCK_TABLE.map((r) => (
                <tr
                  key={r.label}
                  className="border-t"
                  style={{
                    borderColor: "hsl(0 0% 0% / 0.08)",
                    background: shock?.label === r.label ? "hsl(var(--ss-aqua) / 0.1)" : undefined,
                  }}
                >
                  <td className="p-2 font-semibold">{r.label}</td>
                  <td className="ss-num p-2">{r.regular}</td>
                  <td className="ss-num p-2">{r.super}</td>
                  <td className="ss-num p-2">{r.liquid}</td>
                  <td className="p-2 opacity-70">{r.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
