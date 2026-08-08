import { useMemo } from "react";
import { FlaskConical, Plus, Trash2, Wand2 } from "lucide-react";
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
            <span className="min-w-0 flex-1 truncate text-[0.78rem] font-semibold">{e.name}</span>
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

      <div className="mt-2 border-t pt-2 text-[0.76rem]" style={{ borderColor: "hsl(var(--ss-sand))" }}>
        Chemical cost logged <strong className="ss-num">{money2(total)}</strong>
      </div>
    </div>
  );
}
