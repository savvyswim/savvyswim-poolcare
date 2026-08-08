import { useMemo } from "react";
import { AlertTriangle, FlaskConical, Plus, Trash2, Wand2 } from "lucide-react";
import { money2 } from "@/crm/lib/pricing";
import { useDosageProducts, type DosageProduct } from "@/crm/lib/serviceConfig";

export type AppliedChem = {
  product_id: string | null;
  name: string;
  dose_key: string;
  unit: string;
  qty: number;
  cost_per_unit: number;
  cost: number;
};

/** Fallback catalog so a fresh install still lets techs log what they poured. */
const FALLBACK: DosageProduct[] = [
  { id: "fb-chlorine", name: "Liquid chlorine 12.5%", dose_key: "chlorine", strength_pct: 12.5, unit: "oz", cost_per_unit: 0.05, is_default: true, sort_order: 1, is_active: true },
  { id: "fb-acid", name: "Muriatic acid", dose_key: "acid", strength_pct: 31.45, unit: "oz", cost_per_unit: 0.04, is_default: true, sort_order: 2, is_active: true },
  { id: "fb-shock", name: "Cal-hypo shock", dose_key: "shock", strength_pct: 68, unit: "lb", cost_per_unit: 4.5, is_default: false, sort_order: 3, is_active: true },
  { id: "fb-alk", name: "Alkalinity up", dose_key: "alkalinity", strength_pct: null, unit: "lb", cost_per_unit: 1.6, is_default: false, sort_order: 4, is_active: true },
  { id: "fb-cya", name: "Stabilizer (CYA)", dose_key: "cya", strength_pct: null, unit: "lb", cost_per_unit: 3.2, is_default: false, sort_order: 5, is_active: true },
  { id: "fb-salt", name: "Pool salt", dose_key: "salt", strength_pct: null, unit: "bag", cost_per_unit: 9.5, is_default: false, sort_order: 6, is_active: true },
  { id: "fb-tabs", name: "Tabs (3\")", dose_key: "tabs", strength_pct: null, unit: "tab", cost_per_unit: 1.1, is_default: false, sort_order: 7, is_active: true },
];

export function chemTotal(entries: AppliedChem[]) {
  return entries.reduce((s, e) => s + (Number(e.cost) || 0), 0);
}

export type DoseVariance = {
  dose_key: string;
  name: string;
  unit: string;
  recommended: number;
  logged: number;
  deltaPct: number | null;
  kind: "match" | "under" | "over" | "missed" | "extra";
  severity: "ok" | "watch" | "critical";
};

const VARIANCE_WATCH = 25;
const VARIANCE_CRITICAL = 50;

/**
 * Compares what the tech actually poured against the dose the engine
 * recommended for this body of water. Anything more than 25% off is worth a
 * look; more than 50% off (or a recommended dose never poured) goes to the
 * office as a hard flag.
 */
export function doseVariances(
  entries: AppliedChem[],
  suggested: Record<string, number> | undefined,
  labels?: Record<string, { name: string; unit: string }>,
): DoseVariance[] {
  const loggedByKey = new Map<string, { qty: number; name: string; unit: string }>();
  for (const e of entries) {
    const cur = loggedByKey.get(e.dose_key) ?? { qty: 0, name: e.name, unit: e.unit };
    cur.qty += Number(e.qty) || 0;
    loggedByKey.set(e.dose_key, cur);
  }

  const keys = new Set([...Object.keys(suggested ?? {}), ...loggedByKey.keys()]);
  const out: DoseVariance[] = [];

  for (const key of keys) {
    const recommended = Math.round((Number(suggested?.[key] ?? 0) || 0) * 10) / 10;
    const hit = loggedByKey.get(key);
    const logged = Math.round((hit?.qty ?? 0) * 10) / 10;
    if (recommended <= 0 && logged <= 0) continue;

    const name = hit?.name ?? labels?.[key]?.name ?? key;
    const unit = hit?.unit ?? labels?.[key]?.unit ?? "oz";

    if (recommended <= 0) {
      out.push({ dose_key: key, name, unit, recommended, logged, deltaPct: null, kind: "extra", severity: "watch" });
      continue;
    }
    if (logged <= 0) {
      out.push({ dose_key: key, name, unit, recommended, logged, deltaPct: -100, kind: "missed", severity: "critical" });
      continue;
    }

    const deltaPct = Math.round(((logged - recommended) / recommended) * 100);
    const abs = Math.abs(deltaPct);
    const severity = abs >= VARIANCE_CRITICAL ? "critical" : abs >= VARIANCE_WATCH ? "watch" : "ok";
    out.push({
      dose_key: key,
      name,
      unit,
      recommended,
      logged,
      deltaPct,
      kind: severity === "ok" ? "match" : deltaPct > 0 ? "over" : "under",
      severity,
    });
  }

  const order = { critical: 0, watch: 1, ok: 2 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}

export function describeVariances(list: DoseVariance[]) {
  return list
    .map((v) => {
      if (v.kind === "missed") return `${v.name}: recommended ${v.recommended} ${v.unit}, none logged`;
      if (v.kind === "extra") return `${v.name}: ${v.logged} ${v.unit} logged, not recommended`;
      return `${v.name}: logged ${v.logged} ${v.unit} vs ${v.recommended} ${v.unit} (${v.deltaPct! > 0 ? "+" : ""}${v.deltaPct}%)`;
    })
    .join(" · ");
}

const VAR_TONE: Record<DoseVariance["severity"], { bg: string; fg: string }> = {
  critical: { bg: "hsl(var(--ss-burgundy) / .12)", fg: "hsl(var(--ss-burgundy))" },
  watch: { bg: "hsl(38 92% 90%)", fg: "hsl(28 80% 30%)" },
  ok: { bg: "hsl(152 55% 92%)", fg: "hsl(152 60% 24%)" },
};

/**
 * What the tech actually poured — product, quantity, live cost. Suggested
 * quantities come from the computed dose for this body of water, but the tech
 * can override anything and add products we never recommended.
 */
export default function ChemicalsAdded({
  entries,
  onChange,
  suggested,
  disabled,
}: {
  entries: AppliedChem[];
  onChange: (next: AppliedChem[]) => void;
  /** dose_key → suggested quantity in the product's unit (usually oz). */
  suggested?: Record<string, number>;
  disabled?: boolean;
}) {
  const { rows } = useDosageProducts(true);
  const products = rows.length ? rows : FALLBACK;
  const total = useMemo(() => chemTotal(entries), [entries]);
  const variances = useMemo(() => doseVariances(entries, suggested), [entries, suggested]);
  const varianceByKey = useMemo(
    () => new Map(variances.map((v) => [v.dose_key, v])),
    [variances],
  );
  const flagged = variances.filter((v) => v.severity !== "ok");

  function line(p: DosageProduct, qty: number): AppliedChem {
    return {
      product_id: p.id.startsWith("fb-") ? null : p.id,
      name: p.name,
      dose_key: p.dose_key,
      unit: p.unit,
      qty,
      cost_per_unit: Number(p.cost_per_unit) || 0,
      cost: Number(((Number(p.cost_per_unit) || 0) * qty).toFixed(2)),
    };
  }

  function add(p: DosageProduct, qty = 0) {
    onChange([...entries, line(p, qty)]);
  }

  function patch(i: number, qty: number) {
    onChange(
      entries.map((e, idx) =>
        idx === i ? { ...e, qty, cost: Number((e.cost_per_unit * qty).toFixed(2)) } : e,
      ),
    );
  }

  function remove(i: number) {
    onChange(entries.filter((_, idx) => idx !== i));
  }

  const quickPicks = products.filter((p) => (suggested?.[p.dose_key] ?? 0) > 0);

  return (
    <div className="ss-card p-3">
      <div className="ss-tag" style={{ fontSize: "0.55rem" }}>
        <FlaskConical size={9} className="mr-1 inline" /> Chemicals added
      </div>

      {!!quickPicks.length && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {quickPicks.map((p) => (
            <button
              key={p.id}
              type="button"
              className="ss-btn ss-btn-ghost"
              disabled={disabled}
              onClick={() => add(p, Number((suggested?.[p.dose_key] ?? 0).toFixed(1)))}
            >
              <Wand2 size={12} /> {p.name} · {suggested?.[p.dose_key]?.toFixed(1)} {p.unit}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 space-y-1.5">
        {!entries.length && (
          <p className="text-[0.76rem] opacity-60">
            Log every product you poured — quantities drive the true chemical cost of this stop.
          </p>
        )}
        {entries.map((e, i) => (
          <div key={`${e.name}-${i}`} className="flex items-center gap-2">
            <span className="min-w-0 flex-1 truncate text-[0.78rem] font-semibold">
              {e.name}
              {(() => {
                const v = varianceByKey.get(e.dose_key);
                if (!v || v.deltaPct === null || v.severity === "ok") return null;
                return (
                  <span
                    className="ml-1.5 rounded-full px-1.5 py-0.5 text-[0.55rem] font-bold uppercase tracking-wide"
                    style={{ background: VAR_TONE[v.severity].bg, color: VAR_TONE[v.severity].fg }}
                  >
                    {v.deltaPct > 0 ? "+" : ""}
                    {v.deltaPct}% vs dose
                  </span>
                );
              })()}
            </span>
            <input
              className="ss-input ss-num w-[86px]"
              type="number"
              min={0}
              step={0.1}
              inputMode="decimal"
              disabled={disabled}
              aria-label={`${e.name} quantity`}
              value={e.qty}
              onChange={(ev) => patch(i, Math.max(0, Number(ev.target.value) || 0))}
            />
            <span className="w-[34px] text-[0.72rem] opacity-60">{e.unit}</span>
            <span className="ss-num w-[62px] text-right text-[0.76rem]">{money2(e.cost)}</span>
            {!disabled && (
              <button type="button" className="ss-btn ss-btn-ghost" aria-label={`Remove ${e.name}`} onClick={() => remove(i)}>
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
      </div>

      {!disabled && (
        <div className="mt-2 flex items-center gap-2">
          <select
            className="ss-input"
            aria-label="Add a chemical"
            value=""
            onChange={(ev) => {
              const p = products.find((x) => x.id === ev.target.value);
              if (p) add(p, Number((suggested?.[p.dose_key] ?? 0).toFixed(1)));
              ev.target.value = "";
            }}
          >
            <option value="">Add a product…</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {money2(Number(p.cost_per_unit) || 0)}/{p.unit}
              </option>
            ))}
          </select>
          <Plus size={13} className="opacity-50" />
        </div>
      )}

      {flagged.length > 0 && (
        <div
          className="mt-2 p-2 text-[0.74rem]"
          style={{
            border: `1px solid ${VAR_TONE[flagged[0]!.severity].fg}`,
            background: VAR_TONE[flagged[0]!.severity].bg,
            color: VAR_TONE[flagged[0]!.severity].fg,
          }}
        >
          <div className="ss-tag flex items-center gap-1" style={{ fontSize: "0.52rem", color: "inherit" }}>
            <AlertTriangle size={10} /> Dose variance — office will be notified
          </div>
          <ul className="mt-1 space-y-0.5">
            {flagged.map((v) => (
              <li key={v.dose_key}>
                {v.kind === "missed"
                  ? `${v.name}: recommended ${v.recommended} ${v.unit}, nothing logged`
                  : v.kind === "extra"
                    ? `${v.name}: ${v.logged} ${v.unit} logged, no dose recommended`
                    : `${v.name}: ${v.logged} ${v.unit} vs ${v.recommended} ${v.unit} recommended (${v.deltaPct! > 0 ? "+" : ""}${v.deltaPct}%)`}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-2 border-t pt-2 text-[0.76rem]" style={{ borderColor: "hsl(var(--ss-sand))" }}>
        Chemical cost logged <strong className="ss-num">{money2(total)}</strong>
      </div>
    </div>
  );
}
