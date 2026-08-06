import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Gauge, RotateCcw } from "lucide-react";
import { SectionTitle, StatTile } from "@/crm/components/Brand";
import { loadModel, STORAGE_KEY, type PricingModel } from "@/crm/pages/PricingMatrix";

const TIERS = ["good", "better", "best"] as const;
type Tier = (typeof TIERS)[number];
const TIER_LABEL: Record<Tier, string> = { good: "GOOD", better: "BETTER", best: "BEST" };

const BE_KEY = "ss-breakeven-dashboard";

type BeState = {
  /** cost row id -> true when the cost scales per pool (variable) */
  variable: Record<string, boolean>;
  mix: Record<Tier, number>;
  activePools: number;
  monthlyChurnPct: number;
  ownerDraw: number;
};

const money = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
const money2 = (n: number) =>
  (Number.isFinite(n) ? n : 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });

const DEFAULT_VARIABLE_HINTS = ["labor", "chemical", "fuel", "vehicle", "supplies"];

function defaultState(model: PricingModel): BeState {
  const variable: Record<string, boolean> = {};
  for (const c of model.costs) {
    variable[c.id] = DEFAULT_VARIABLE_HINTS.some((h) => c.label.toLowerCase().includes(h));
  }
  return {
    variable,
    mix: { good: 30, better: 50, best: 20 },
    activePools: model.pools,
    monthlyChurnPct: 2,
    ownerDraw: 0,
  };
}

function loadState(model: PricingModel): BeState {
  const base = defaultState(model);
  try {
    const raw = localStorage.getItem(BE_KEY);
    if (!raw) return base;
    const p = JSON.parse(raw) as Partial<BeState>;
    return { ...base, ...p, variable: { ...base.variable, ...(p.variable ?? {}) } };
  } catch {
    return base;
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

export default function BreakEven() {
  const [model, setModel] = useState<PricingModel>(loadModel);
  const [state, setState] = useState<BeState>(() => loadState(loadModel()));

  // Pick up edits made in the Pricing Matrix while this tab stays open.
  useEffect(() => {
    const sync = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setModel(loadModel());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);

  useEffect(() => {
    localStorage.setItem(BE_KEY, JSON.stringify(state));
  }, [state]);

  const calc = useMemo(() => {
    const pools = model.pools > 0 ? model.pools : 0;
    const variableMonthly = model.costs
      .filter((c) => state.variable[c.id])
      .reduce((s, c) => s + c.monthly, 0);
    const fixedMonthly =
      model.costs.filter((c) => !state.variable[c.id]).reduce((s, c) => s + c.monthly, 0) +
      state.ownerDraw;
    const variablePerPool = pools > 0 ? variableMonthly / pools : 0;

    const mixTotal = TIERS.reduce((s, t) => s + (state.mix[t] || 0), 0);
    const tiers = TIERS.map((t) => {
      const share = mixTotal > 0 ? (state.mix[t] || 0) / mixTotal : 0;
      const price = model.prices[t];
      const pools_ = share * state.activePools;
      return {
        key: t,
        name: model.names[t] || TIER_LABEL[t],
        price,
        share,
        pools: pools_,
        contribution: price - variablePerPool,
        monthlyRevenue: price * pools_,
        annualRevenue: price * pools_ * 12,
      };
    });

    const blendedPrice = tiers.reduce((s, t) => s + t.price * t.share, 0);
    const contribution = blendedPrice - variablePerPool;
    const breakEvenPools = contribution > 0 ? fixedMonthly / contribution : Infinity;
    const breakEvenRevenue = contribution > 0 ? breakEvenPools * blendedPrice : Infinity;

    const monthlyRevenue = tiers.reduce((s, t) => s + t.monthlyRevenue, 0);
    const monthlyVariable = variablePerPool * state.activePools;
    const monthlyProfit = monthlyRevenue - monthlyVariable - fixedMonthly;
    const netMargin = monthlyRevenue > 0 ? monthlyProfit / monthlyRevenue : 0;
    const cushion = state.activePools - breakEvenPools;
    const safetyPct = state.activePools > 0 ? cushion / state.activePools : 0;

    // 12-month projection with churn applied to the active book.
    const keep = 1 - Math.min(Math.max(state.monthlyChurnPct, 0), 100) / 100;
    let poolsN = state.activePools;
    const months: {
      m: number;
      pools: number;
      revenue: number;
      profit: number;
      cumulative: number;
    }[] = [];
    let cumulative = 0;
    for (let m = 1; m <= 12; m++) {
      const revenue = poolsN * blendedPrice;
      const profit = poolsN * contribution - fixedMonthly;
      cumulative += profit;
      months.push({ m, pools: poolsN, revenue, profit, cumulative });
      poolsN = poolsN * keep;
    }
    const annualRevenue = months.reduce((s, x) => s + x.revenue, 0);
    const annualProfit = cumulative;

    return {
      pools,
      variableMonthly,
      fixedMonthly,
      variablePerPool,
      blendedPrice,
      contribution,
      breakEvenPools,
      breakEvenRevenue,
      monthlyRevenue,
      monthlyVariable,
      monthlyProfit,
      netMargin,
      cushion,
      safetyPct,
      tiers,
      months,
      annualRevenue,
      annualProfit,
      mixTotal,
    };
  }, [model, state]);

  const barPct = Number.isFinite(calc.breakEvenPools)
    ? Math.min(100, (state.activePools / Math.max(calc.breakEvenPools, 0.0001)) * 100)
    : 0;
  const above = calc.monthlyProfit >= 0;

  return (
    <div className="space-y-5">
      <div className="ss-hero p-4">
        <div className="ss-tag" style={{ color: "rgba(255,255,255,.7)" }}>
          Savvy FinOps
        </div>
        <h1 className="mt-1 flex items-center gap-2 text-[1.4rem] leading-none">
          <Gauge size={20} /> Break-Even & Profitability
        </h1>
        <p className="mt-2 max-w-xl text-[0.8rem] opacity-80">
          Built from your{" "}
          <Link to="/admin/crm/pricing-matrix" className="underline">
            Pricing Matrix
          </Link>{" "}
          tiers and costs. Split fixed vs per-pool costs, set your tier mix, and see exactly how many
          pools pay the bills.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label="Break-even pools / month"
          value={Number.isFinite(calc.breakEvenPools) ? Math.ceil(calc.breakEvenPools).toString() : "—"}
          tone="hero"
        />
        <StatTile
          label="Break-even revenue"
          value={Number.isFinite(calc.breakEvenRevenue) ? money(calc.breakEvenRevenue) : "—"}
        />
        <StatTile label="Monthly profit" value={money(calc.monthlyProfit)} />
        <StatTile label="Net margin" value={`${(calc.netMargin * 100).toFixed(1)}%`} />
      </div>

      <section className="ss-card p-4">
        <SectionTitle
          title="Where you stand this month"
          sub={`${state.activePools} active pools vs ${
            Number.isFinite(calc.breakEvenPools) ? Math.ceil(calc.breakEvenPools) : "—"
          } needed to break even`}
          right={
            <button
              type="button"
              onClick={() => setState(defaultState(model))}
              className="ss-chip flex items-center gap-1"
            >
              <RotateCcw size={12} /> Reset
            </button>
          }
        />
        <div className="h-3 w-full overflow-hidden rounded-full bg-[hsl(var(--ss-ink)/0.1)]">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${barPct}%`,
              background: above ? "hsl(var(--ss-aqua))" : "hsl(var(--ss-burgundy))",
            }}
          />
        </div>
        <p className="mt-2 text-[0.8rem]">
          {above ? (
            <>
              You are <strong>{Math.floor(calc.cushion)}</strong> pools past break-even — a safety
              cushion of {(calc.safetyPct * 100).toFixed(0)}%. Every extra pool adds{" "}
              <strong>{money2(calc.contribution)}</strong> of profit per month.
            </>
          ) : (
            <>
              You need <strong>{Math.ceil(-calc.cushion)}</strong> more pools (about{" "}
              {money(-calc.cushion * calc.blendedPrice)} / month) to cover fixed costs.
            </>
          )}
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="ss-tag">Active pools on the book</span>
            <div className="mt-1">
              <NumInput
                value={state.activePools}
                onChange={(activePools) => setState((s) => ({ ...s, activePools }))}
              />
            </div>
          </label>
          <label className="block">
            <span className="ss-tag">Owner draw / salary</span>
            <div className="mt-1">
              <NumInput
                prefix="$"
                value={state.ownerDraw}
                onChange={(ownerDraw) => setState((s) => ({ ...s, ownerDraw }))}
              />
            </div>
          </label>
          <label className="block">
            <span className="ss-tag">Monthly churn</span>
            <div className="mt-1">
              <NumInput
                suffix="%"
                step={0.5}
                value={state.monthlyChurnPct}
                onChange={(monthlyChurnPct) => setState((s) => ({ ...s, monthlyChurnPct }))}
              />
            </div>
          </label>
          <div className="rounded-md border border-[hsl(var(--ss-ink)/0.12)] p-2">
            <div className="ss-tag">Blended price / pool</div>
            <div className="ss-num mt-1 text-[1.05rem] font-bold">{money2(calc.blendedPrice)}</div>
            <div className="text-[0.65rem] opacity-50">
              Contribution {money2(calc.contribution)} after variable cost
            </div>
          </div>
        </div>
      </section>

      <section className="ss-card p-4">
        <SectionTitle
          title="Step 1 — Split fixed vs per-pool costs"
          sub="Costs come from the Pricing Matrix. Tick the ones that grow with every pool you add."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-[0.82rem]">
            <thead>
              <tr className="text-left">
                <th className="ss-tag pb-2">Cost category</th>
                <th className="ss-tag pb-2 text-right">Monthly total</th>
                <th className="ss-tag pb-2 text-center">Scales per pool</th>
                <th className="ss-tag pb-2 text-right">Treated as</th>
              </tr>
            </thead>
            <tbody>
              {model.costs.map((c) => {
                const isVar = !!state.variable[c.id];
                return (
                  <tr key={c.id} className="border-t border-[hsl(var(--ss-ink)/0.1)]">
                    <td className="py-1.5 pr-2">{c.label}</td>
                    <td className="ss-num py-1.5 pr-2 text-right">{money2(c.monthly)}</td>
                    <td className="py-1.5 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${c.label} scales per pool`}
                        checked={isVar}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            variable: { ...s.variable, [c.id]: e.target.checked },
                          }))
                        }
                        className="h-4 w-4 accent-[hsl(var(--ss-burgundy))]"
                      />
                    </td>
                    <td className="py-1.5 text-right text-[0.75rem] opacity-60">
                      {isVar ? "Variable" : "Fixed"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[hsl(var(--ss-burgundy)/0.35)]">
                <td className="ss-tag py-2">Fixed monthly {state.ownerDraw > 0 && "(incl. owner draw)"}</td>
                <td className="ss-num py-2 pr-2 text-right font-bold">{money2(calc.fixedMonthly)}</td>
                <td className="ss-tag py-2 text-center">Variable / pool</td>
                <td className="ss-num py-2 text-right font-bold">{money2(calc.variablePerPool)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="ss-card p-4">
        <SectionTitle
          title="Step 2 — Customer mix across your tiers"
          sub={
            calc.mixTotal === 100
              ? "Shares total 100% — nice."
              : `Shares total ${calc.mixTotal}% and are normalized automatically.`
          }
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-[0.82rem]">
            <thead>
              <tr className="text-left">
                <th className="ss-tag pb-2">Tier</th>
                <th className="ss-tag pb-2 text-right">Price</th>
                <th className="ss-tag pb-2 text-right">Mix</th>
                <th className="ss-tag pb-2 text-right">Pools</th>
                <th className="ss-tag pb-2 text-right">Contribution / pool</th>
                <th className="ss-tag pb-2 text-right">Monthly revenue</th>
                <th className="ss-tag pb-2 text-right">Annual revenue</th>
              </tr>
            </thead>
            <tbody>
              {calc.tiers.map((t) => (
                <tr key={t.key} className="border-t border-[hsl(var(--ss-ink)/0.1)]">
                  <td className="py-1.5 pr-2 font-semibold">{t.name}</td>
                  <td className="ss-num py-1.5 pr-2 text-right">{money2(t.price)}</td>
                  <td className="w-[110px] py-1.5 pr-2">
                    <NumInput
                      suffix="%"
                      value={state.mix[t.key]}
                      onChange={(v) => setState((s) => ({ ...s, mix: { ...s.mix, [t.key]: v } }))}
                    />
                  </td>
                  <td className="ss-num py-1.5 pr-2 text-right">{t.pools.toFixed(0)}</td>
                  <td className="ss-num py-1.5 pr-2 text-right">{money2(t.contribution)}</td>
                  <td className="ss-num py-1.5 pr-2 text-right">{money(t.monthlyRevenue)}</td>
                  <td className="ss-num py-1.5 text-right font-semibold">{money(t.annualRevenue)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[hsl(var(--ss-burgundy)/0.35)]">
                <td className="ss-tag py-2">Blended</td>
                <td className="ss-num py-2 pr-2 text-right font-bold">{money2(calc.blendedPrice)}</td>
                <td />
                <td className="ss-num py-2 pr-2 text-right font-bold">{state.activePools}</td>
                <td className="ss-num py-2 pr-2 text-right font-bold">{money2(calc.contribution)}</td>
                <td className="ss-num py-2 pr-2 text-right font-bold">{money(calc.monthlyRevenue)}</td>
                <td className="ss-num py-2 text-right font-bold">{money(calc.monthlyRevenue * 12)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section className="ss-card p-4">
        <SectionTitle
          title="Monthly P&L snapshot"
          sub="At today's book, mix and cost split"
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile label="Revenue" value={money(calc.monthlyRevenue)} />
          <StatTile label="Variable costs" value={`- ${money(calc.monthlyVariable)}`} />
          <StatTile label="Fixed costs" value={`- ${money(calc.fixedMonthly)}`} />
          <StatTile
            label={calc.monthlyProfit >= 0 ? "Profit" : "Loss"}
            value={money(calc.monthlyProfit)}
            tone="hero"
          />
        </div>
      </section>

      <section className="ss-card p-4">
        <SectionTitle
          title="12-month projection"
          sub={`Churn ${state.monthlyChurnPct}% / month applied to the active book`}
        />
        <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <StatTile label="Annual revenue" value={money(calc.annualRevenue)} />
          <StatTile label="Annual profit" value={money(calc.annualProfit)} />
          <StatTile
            label="Avg profit / month"
            value={money(calc.annualProfit / 12)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-[0.82rem]">
            <thead>
              <tr className="text-left">
                <th className="ss-tag pb-2">Month</th>
                <th className="ss-tag pb-2 text-right">Pools</th>
                <th className="ss-tag pb-2 text-right">Revenue</th>
                <th className="ss-tag pb-2 text-right">Profit</th>
                <th className="ss-tag pb-2 text-right">Cumulative</th>
              </tr>
            </thead>
            <tbody>
              {calc.months.map((r) => (
                <tr key={r.m} className="border-t border-[hsl(var(--ss-ink)/0.1)]">
                  <td className="py-1.5 pr-2">Month {r.m}</td>
                  <td className="ss-num py-1.5 pr-2 text-right">{r.pools.toFixed(0)}</td>
                  <td className="ss-num py-1.5 pr-2 text-right">{money(r.revenue)}</td>
                  <td
                    className="ss-num py-1.5 pr-2 text-right font-semibold"
                    style={{ color: r.profit < 0 ? "hsl(var(--ss-burgundy))" : undefined }}
                  >
                    {money(r.profit)}
                  </td>
                  <td className="ss-num py-1.5 text-right">{money(r.cumulative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
