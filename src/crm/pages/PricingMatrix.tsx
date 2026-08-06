import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2, Grid3x3 } from "lucide-react";
import { SectionTitle, StatTile } from "@/crm/components/Brand";

type CostRow = { id: string; label: string; monthly: number };
type FeatureRow = { id: string; label: string; good: boolean; better: boolean; best: boolean };

type Model = {
  pools: number;
  costs: CostRow[];
  margin: number;
  tierPct: { good: number; better: number; best: number };
  names: { good: string; better: string; best: string };
  prices: { good: number; better: number; best: number };
  annualPools: number;
  features: FeatureRow[];
};

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_MODEL: Model = {
  pools: 75,
  costs: [
    ["Labor (your time or tech wages)", 3200],
    ["Chemicals & test supplies", 2000],
    ["Fuel & vehicle costs", 1200],
    ["Insurance (monthly share)", 250],
    ["Software & tech (monthly share)", 50],
    ["Marketing (monthly share)", 200],
    ["Other overhead", 200],
  ].map(([label, monthly]) => ({ id: uid(), label: label as string, monthly: monthly as number })),
  margin: 40,
  tierPct: { good: 85, better: 100, best: 135 },
  names: { good: "Basic Care", better: "Pro Care", best: "Platinum Care" },
  prices: { good: 134, better: 158, best: 213 },
  annualPools: 40,
  features: [
    ["Chemical balancing", true, true, true],
    ["Basket emptying", true, true, true],
    ["Surface skimming", false, true, true],
    ["Brushing walls & floor", false, true, true],
    ["Filter maintenance", false, true, true],
    ["Vacuuming", false, false, true],
    ["Equipment inspection", false, false, true],
    ["Service report / photos", false, true, true],
    ["Priority scheduling", false, false, true],
  ].map(([label, good, better, best]) => ({
    id: uid(),
    label: label as string,
    good: good as boolean,
    better: better as boolean,
    best: best as boolean,
  })),
};

const STORAGE_KEY = "ss-pricing-matrix-builder";
const TIERS = ["good", "better", "best"] as const;
type Tier = (typeof TIERS)[number];
const TIER_LABEL: Record<Tier, string> = { good: "GOOD", better: "BETTER", best: "BEST" };

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function loadModel(): Model {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MODEL;
    const p = JSON.parse(raw) as Model;
    if (!p || !Array.isArray(p.costs) || !Array.isArray(p.features)) return DEFAULT_MODEL;
    return { ...DEFAULT_MODEL, ...p };
  } catch {
    return DEFAULT_MODEL;
  }
}

function NumInput({
  value,
  onChange,
  prefix,
  suffix,
  step = 1,
}: {
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}) {
  return (
    <div className="flex items-center gap-1 rounded-md border border-[hsl(var(--ss-ink)/0.15)] bg-[hsl(48_44%_97%)] px-2 py-1">
      {prefix && <span className="text-[0.7rem] opacity-50">{prefix}</span>}
      <input
        type="number"
        min={0}
        step={step}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        className="ss-num w-full bg-transparent text-right text-[0.85rem] outline-none"
      />
      {suffix && <span className="text-[0.7rem] opacity-50">{suffix}</span>}
    </div>
  );
}

export default function PricingMatrix() {
  const [model, setModel] = useState<Model>(loadModel);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
  }, [model]);

  const calc = useMemo(() => {
    const pools = model.pools > 0 ? model.pools : 0;
    const rows = model.costs.map((c) => ({
      ...c,
      perPool: pools > 0 ? c.monthly / pools : 0,
    }));
    const totalMonthly = rows.reduce((s, r) => s + r.monthly, 0);
    const costPerPool = pools > 0 ? totalMonthly / pools : 0;
    const m = Math.min(Math.max(model.margin, 0), 95) / 100;
    const basePrice = m < 1 ? costPerPool / (1 - m) : 0;
    const tiers = TIERS.map((t) => {
      const price = model.prices[t];
      return {
        key: t,
        name: model.names[t],
        suggested: (basePrice * model.tierPct[t]) / 100,
        price,
        margin: price > 0 ? (price - costPerPool) / price : 0,
        annual: price * 12 * model.annualPools,
      };
    });
    return { rows, totalMonthly, costPerPool, basePrice, tiers };
  }, [model]);

  const patchCost = (id: string, patch: Partial<CostRow>) =>
    setModel((m) => ({ ...m, costs: m.costs.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));
  const patchFeature = (id: string, patch: Partial<FeatureRow>) =>
    setModel((m) => ({ ...m, features: m.features.map((f) => (f.id === id ? { ...f, ...patch } : f)) }));

  return (
    <div className="space-y-5">
      <div className="ss-hero p-4">
        <div className="ss-tag" style={{ color: "rgba(255,255,255,.7)" }}>
          Savvy FinOps
        </div>
        <h1 className="mt-1 flex items-center gap-2 text-[1.4rem] leading-none">
          <Grid3x3 size={20} /> Pricing Matrix Builder
        </h1>
        <p className="mt-2 max-w-xl text-[0.8rem] opacity-80">
          Build Good / Better / Best service tiers with confidence — pricing is math, not emotion.
          Every field is editable and saves automatically.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total monthly cost" value={money(calc.totalMonthly)} />
        <StatTile label="True cost per pool" value={money(calc.costPerPool)} />
        <StatTile label="Target margin" value={`${model.margin.toFixed(0)}%`} />
        <StatTile label="Calculated base price" value={money(calc.basePrice)} tone="hero" />
      </div>

      <section className="ss-card p-4">
        <SectionTitle
          title="Step 1 — Know your true cost per pool"
          sub="Monthly total ÷ pools serviced per month"
          right={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setModel((m) => ({
                    ...m,
                    costs: [...m.costs, { id: uid(), label: "New cost", monthly: 0 }],
                  }))
                }
                className="ss-chip flex items-center gap-1"
              >
                <Plus size={12} /> Add cost
              </button>
              <button
                type="button"
                onClick={() => setModel(DEFAULT_MODEL)}
                className="ss-chip flex items-center gap-1"
              >
                <RotateCcw size={12} /> Reset
              </button>
            </div>
          }
        />

        <label className="mb-3 block max-w-[220px]">
          <span className="ss-tag">Pools serviced / month</span>
          <div className="mt-1">
            <NumInput value={model.pools} onChange={(pools) => setModel((m) => ({ ...m, pools }))} />
          </div>
        </label>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[0.82rem]">
            <thead>
              <tr className="text-left">
                <th className="ss-tag pb-2">Cost category</th>
                <th className="ss-tag pb-2 text-right">Monthly total</th>
                <th className="ss-tag pb-2 text-right">Cost per pool</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {calc.rows.map((r) => (
                <tr key={r.id} className="border-t border-[hsl(var(--ss-ink)/0.1)]">
                  <td className="py-1.5 pr-2">
                    <input
                      value={r.label}
                      onChange={(e) => patchCost(r.id, { label: e.target.value })}
                      className="w-full rounded-md border border-transparent bg-transparent px-1 py-1 outline-none focus:border-[hsl(var(--ss-ink)/0.2)]"
                    />
                  </td>
                  <td className="w-[140px] py-1.5 pr-2">
                    <NumInput
                      prefix="$"
                      step={0.01}
                      value={r.monthly}
                      onChange={(monthly) => patchCost(r.id, { monthly })}
                    />
                  </td>
                  <td className="ss-num py-1.5 pr-2 text-right font-semibold">{money(r.perPool)}</td>
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      aria-label={`Remove ${r.label}`}
                      onClick={() => setModel((m) => ({ ...m, costs: m.costs.filter((c) => c.id !== r.id) }))}
                      className="opacity-45 transition-opacity hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[hsl(var(--ss-burgundy)/0.35)]">
                <td className="ss-tag py-2">Total cost per pool</td>
                <td className="ss-num py-2 pr-2 text-right font-bold">{money(calc.totalMonthly)}</td>
                <td className="ss-num py-2 pr-2 text-right font-bold">{money(calc.costPerPool)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="ss-card p-4">
        <SectionTitle
          title="Step 2 — Set your target profit margin"
          sub="Recommended: 40% for pool service (base price = cost ÷ (1 − margin))"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="ss-tag">Target profit margin</span>
            <div className="mt-1">
              <NumInput
                suffix="%"
                value={model.margin}
                onChange={(margin) => setModel((m) => ({ ...m, margin }))}
              />
            </div>
          </label>
          <div className="rounded-md border border-[hsl(var(--ss-ink)/0.12)] p-2">
            <div className="ss-tag">Calculated base price</div>
            <div className="ss-num mt-1 text-[1.05rem] font-bold">{money(calc.basePrice)}</div>
            <div className="text-[0.65rem] opacity-50">Your tiers are built from this</div>
          </div>
          <label className="block">
            <span className="ss-tag">Pools for annual projection</span>
            <div className="mt-1">
              <NumInput
                value={model.annualPools}
                onChange={(annualPools) => setModel((m) => ({ ...m, annualPools }))}
              />
            </div>
          </label>
        </div>
      </section>

      <section className="ss-card p-4">
        <SectionTitle
          title="Step 3 — Build your Good / Better / Best tiers"
          sub="Suggested price = base × tier %. Override any price — margins recalculate."
        />
        <div className="grid gap-3 md:grid-cols-3">
          {calc.tiers.map((t) => (
            <div key={t.key} className="rounded-lg border border-[hsl(var(--ss-ink)/0.14)] p-3">
              <div className="ss-tag">{TIER_LABEL[t.key]}</div>
              <input
                value={t.name}
                onChange={(e) =>
                  setModel((m) => ({ ...m, names: { ...m.names, [t.key]: e.target.value } }))
                }
                className="mt-1 w-full rounded-md border border-transparent bg-transparent text-[1rem] font-semibold outline-none focus:border-[hsl(var(--ss-ink)/0.2)]"
              />
              <div className="mt-2 grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="ss-tag">Tier % of base</span>
                  <div className="mt-1">
                    <NumInput
                      suffix="%"
                      value={model.tierPct[t.key]}
                      onChange={(v) =>
                        setModel((m) => ({ ...m, tierPct: { ...m.tierPct, [t.key]: v } }))
                      }
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="ss-tag">Monthly price</span>
                  <div className="mt-1">
                    <NumInput
                      prefix="$"
                      step={0.01}
                      value={model.prices[t.key]}
                      onChange={(v) => setModel((m) => ({ ...m, prices: { ...m.prices, [t.key]: v } }))}
                    />
                  </div>
                </label>
              </div>
              <button
                type="button"
                onClick={() =>
                  setModel((m) => ({
                    ...m,
                    prices: { ...m.prices, [t.key]: Math.round(t.suggested) },
                  }))
                }
                className="ss-chip mt-2"
              >
                Use suggested {money(t.suggested)}
              </button>
              <div className="mt-3 space-y-1 text-[0.78rem]">
                <div className="flex justify-between">
                  <span className="opacity-60">Profit margin</span>
                  <span className="ss-num font-semibold">{(t.margin * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Profit per pool</span>
                  <span className="ss-num font-semibold">{money(t.price - calc.costPerPool)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Annual @ {model.annualPools} pools</span>
                  <span className="ss-num font-semibold">{money(t.annual)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="ss-card p-4">
        <SectionTitle
          title="Included services checklist"
          sub="Tick what each tier includes"
          right={
            <button
              type="button"
              onClick={() =>
                setModel((m) => ({
                  ...m,
                  features: [
                    ...m.features,
                    { id: uid(), label: "New service", good: false, better: false, best: false },
                  ],
                }))
              }
              className="ss-chip flex items-center gap-1"
            >
              <Plus size={12} /> Add line
            </button>
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[0.82rem]">
            <thead>
              <tr className="text-left">
                <th className="ss-tag pb-2">Service</th>
                {calc.tiers.map((t) => (
                  <th key={t.key} className="ss-tag pb-2 text-center">
                    {t.name || TIER_LABEL[t.key]}
                  </th>
                ))}
                <th />
              </tr>
            </thead>
            <tbody>
              {model.features.map((f) => (
                <tr key={f.id} className="border-t border-[hsl(var(--ss-ink)/0.1)]">
                  <td className="py-1.5 pr-2">
                    <input
                      value={f.label}
                      onChange={(e) => patchFeature(f.id, { label: e.target.value })}
                      className="w-full rounded-md border border-transparent bg-transparent px-1 py-1 outline-none focus:border-[hsl(var(--ss-ink)/0.2)]"
                    />
                  </td>
                  {TIERS.map((t) => (
                    <td key={t} className="py-1.5 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${f.label} in ${TIER_LABEL[t]}`}
                        checked={f[t]}
                        onChange={(e) => patchFeature(f.id, { [t]: e.target.checked } as Partial<FeatureRow>)}
                        className="h-4 w-4 accent-[hsl(var(--ss-burgundy))]"
                      />
                    </td>
                  ))}
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      aria-label={`Remove ${f.label}`}
                      onClick={() =>
                        setModel((m) => ({ ...m, features: m.features.filter((x) => x.id !== f.id) }))
                      }
                      className="opacity-45 transition-opacity hover:opacity-100"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
