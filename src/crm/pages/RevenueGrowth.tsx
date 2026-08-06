import { useEffect, useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2, TrendingUp } from "lucide-react";
import { SectionTitle, StatTile } from "@/crm/components/Brand";

type Cadence = "one-time" | "recurring";
type AddOn = { id: string; name: string; price: number; jobs: number; cadence?: Cadence; intervalDays?: number };

type Model = {
  pools: number;
  avgPrice: number;
  addOns: AddOn[];
};

const DEFAULT_ADDONS: string[] = [
  "Filter Cleaning (DE / Cartridge)",
  "Green-to-Clean Treatment",
  "Acid Wash",
  "Equipment Inspection Report",
  "Salt Cell Cleaning",
  "Phosphate Treatment",
  "Pool Opening / Closing",
  "Algae Treatment",
  "Chemical Delivery (add-on)",
  "Seasonal One-Time Service",
];

const uid = () => Math.random().toString(36).slice(2, 10);

const DEFAULT_MODEL: Model = {
  pools: 0,
  avgPrice: 0,
  addOns: DEFAULT_ADDONS.map((name) => ({
    id: uid(),
    name,
    price: 0,
    jobs: 0,
    cadence: (name.startsWith("Filter") ? "recurring" : "one-time") as Cadence,
    intervalDays: name.startsWith("Filter") ? 90 : undefined,
  })),
};

const STORAGE_KEY = "ss-revenue-growth-calculator";

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

function loadModel(): Model {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_MODEL;
    const parsed = JSON.parse(raw) as Model;
    if (!parsed || !Array.isArray(parsed.addOns)) return DEFAULT_MODEL;
    return parsed;
  } catch {
    return DEFAULT_MODEL;
  }
}

function NumInput({
  value,
  onChange,
  prefix,
  step = 1,
}: {
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
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
        className="ss-num w-full bg-transparent text-right text-[0.85rem] outline-hidden"
      />
    </div>
  );
}

export default function RevenueGrowth() {
  const [model, setModel] = useState<Model>(loadModel);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
  }, [model]);

  const calc = useMemo(() => {
    const baseMonthly = model.pools * model.avgPrice;
    const rows = model.addOns.map((a) => {
      const monthly = a.price * a.jobs;
      return { ...a, monthly, annual: monthly * 12 };
    });
    const upsellMonthly = rows.reduce((s, r) => s + r.monthly, 0);
    return {
      rows,
      baseMonthly,
      baseAnnual: baseMonthly * 12,
      upsellMonthly,
      upsellAnnual: upsellMonthly * 12,
      totalMonthly: baseMonthly + upsellMonthly,
      totalAnnual: (baseMonthly + upsellMonthly) * 12,
      liftPct: baseMonthly > 0 ? (upsellMonthly / baseMonthly) * 100 : 0,
      perPoolMonthly: model.pools > 0 ? (baseMonthly + upsellMonthly) / model.pools : 0,
    };
  }, [model]);

  const patchAddOn = (id: string, patch: Partial<AddOn>) =>
    setModel((m) => ({ ...m, addOns: m.addOns.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));

  return (
    <div className="space-y-5">
      <div className="ss-hero p-4">
        <div className="ss-tag" style={{ color: "rgba(255,255,255,.7)" }}>
          Savvy FinOps
        </div>
        <h1 className="mt-1 flex items-center gap-2 text-[1.4rem] leading-none">
          <TrendingUp size={20} /> Revenue Growth Calculator
        </h1>
        <p className="mt-2 max-w-xl text-[0.8rem] opacity-80">
          Discover how much hidden revenue is already sitting in your existing customer base. Every
          field is editable — totals recalculate instantly and save automatically.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Current monthly revenue" value={money(calc.baseMonthly)} />
        <StatTile label="Upsell monthly revenue" value={money(calc.upsellMonthly)} />
        <StatTile label="Total monthly revenue" value={money(calc.totalMonthly)} tone="hero" />
        <StatTile label="Total annual revenue" value={money(calc.totalAnnual)} tone="hero" />
      </div>

      <section className="ss-card p-4">
        <SectionTitle
          title="Your current route baseline"
          sub="Pools on route × average monthly service price"
          right={
            <button
              type="button"
              onClick={() => setModel(DEFAULT_MODEL)}
              className="ss-chip flex items-center gap-1"
            >
              <RotateCcw size={12} /> Reset
            </button>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="ss-tag">Total pools on route</span>
            <div className="mt-1">
              <NumInput value={model.pools} onChange={(pools) => setModel((m) => ({ ...m, pools }))} />
            </div>
          </label>
          <label className="block">
            <span className="ss-tag">Average monthly service price</span>
            <div className="mt-1">
              <NumInput
                prefix="$"
                step={0.01}
                value={model.avgPrice}
                onChange={(avgPrice) => setModel((m) => ({ ...m, avgPrice }))}
              />
            </div>
          </label>
          <div className="rounded-md border border-[hsl(var(--ss-ink)/0.12)] p-2">
            <div className="ss-tag">Current monthly service revenue</div>
            <div className="ss-num mt-1 text-[1.05rem] font-bold">{money(calc.baseMonthly)}</div>
            <div className="text-[0.65rem] opacity-50">Auto-calculated</div>
          </div>
          <div className="rounded-md border border-[hsl(var(--ss-ink)/0.12)] p-2">
            <div className="ss-tag">Current annual service revenue</div>
            <div className="ss-num mt-1 text-[1.05rem] font-bold">{money(calc.baseAnnual)}</div>
            <div className="text-[0.65rem] opacity-50">Auto-calculated</div>
          </div>
        </div>
      </section>

      <section className="ss-card p-4">
        <SectionTitle
          title="Ancillary services — upsell revenue planner"
          sub="Price per job × jobs per month = monthly revenue (×12 = annual)"
          right={
            <button
              type="button"
              onClick={() =>
                setModel((m) => ({
                  ...m,
                  addOns: [...m.addOns, { id: uid(), name: "New service", price: 0, jobs: 0, cadence: "one-time" as Cadence }],
                }))
              }
              className="ss-chip flex items-center gap-1"
            >
              <Plus size={12} /> Add service
            </button>
          }
        />

        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-[0.82rem]">
            <thead>
              <tr className="text-left">
                <th className="ss-tag pb-2">Service / add-on</th>
                <th className="ss-tag pb-2">Schedule</th>
                <th className="ss-tag pb-2 text-right">Price per job</th>
                <th className="ss-tag pb-2 text-right">Jobs per month</th>
                <th className="ss-tag pb-2 text-right">Monthly revenue</th>
                <th className="ss-tag pb-2 text-right">Annual revenue</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {calc.rows.map((r) => (
                <tr key={r.id} className="border-t border-[hsl(var(--ss-ink)/0.1)]">
                  <td className="py-1.5 pr-2">
                    <input
                      value={r.name}
                      onChange={(e) => patchAddOn(r.id, { name: e.target.value })}
                      className="w-full rounded-md border border-transparent bg-transparent px-1 py-1 outline-hidden focus:border-[hsl(var(--ss-ink)/0.2)]"
                    />
                  </td>
                  <td className="w-[190px] py-1.5 pr-2">
                    <div className="flex items-center gap-1.5">
                      <select
                        aria-label={`Schedule for ${r.name}`}
                        value={r.cadence ?? "one-time"}
                        onChange={(e) => patchAddOn(r.id, { cadence: e.target.value as Cadence, intervalDays: e.target.value === "recurring" ? (r.intervalDays ?? 90) : undefined })}
                        className="rounded-md border border-[hsl(var(--ss-ink)/0.15)] bg-[hsl(48_44%_97%)] px-1.5 py-1 text-[0.72rem] outline-hidden"
                      >
                        <option value="one-time">One-time</option>
                        <option value="recurring">Maintenance</option>
                      </select>
                      {(r.cadence ?? "one-time") === "recurring" && (
                        <span className="flex items-center gap-1 text-[0.68rem] opacity-70">
                          every
                          <input
                            type="number"
                            min={1}
                            aria-label={`Interval days for ${r.name}`}
                            value={r.intervalDays ?? 90}
                            onChange={(e) => patchAddOn(r.id, { intervalDays: parseInt(e.target.value) || 90 })}
                            className="ss-num w-[52px] rounded-md border border-[hsl(var(--ss-ink)/0.15)] bg-[hsl(48_44%_97%)] px-1 py-0.5 text-right outline-hidden"
                          />
                          days
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="w-[130px] py-1.5 pr-2">
                    <NumInput
                      prefix="$"
                      step={0.01}
                      value={r.price}
                      onChange={(price) => patchAddOn(r.id, { price })}
                    />
                  </td>
                  <td className="w-[110px] py-1.5 pr-2">
                    <NumInput value={r.jobs} onChange={(jobs) => patchAddOn(r.id, { jobs })} />
                  </td>
                  <td className="ss-num py-1.5 pr-2 text-right font-semibold">{money(r.monthly)}</td>
                  <td className="ss-num py-1.5 pr-2 text-right font-semibold">{money(r.annual)}</td>
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      aria-label={`Remove ${r.name}`}
                      onClick={() =>
                        setModel((m) => ({ ...m, addOns: m.addOns.filter((a) => a.id !== r.id) }))
                      }
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
                <td className="ss-tag py-2">Total upsell revenue</td>
                <td />
                <td />
                <td />
                <td className="ss-num py-2 text-right font-bold">{money(calc.upsellMonthly)}</td>
                <td className="ss-num py-2 text-right font-bold">{money(calc.upsellAnnual)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="ss-card p-4">
        <SectionTitle title="Growth summary" sub="Baseline vs. upsell potential" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Revenue lift vs. baseline" value={`${calc.liftPct.toFixed(1)}%`} />
          <StatTile label="Avg revenue per pool / mo" value={money(calc.perPoolMonthly)} />
          <StatTile label="Upsell annual revenue" value={money(calc.upsellAnnual)} />
          <StatTile label="Baseline annual revenue" value={money(calc.baseAnnual)} />
        </div>
      </section>
    </div>
  );
}
