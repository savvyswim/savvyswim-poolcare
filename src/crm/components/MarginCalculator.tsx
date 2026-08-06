import { useMemo, useState } from "react";
import { Calculator, Package, Percent, Plus, Trash2, TrendingUp } from "lucide-react";
import { Chip } from "@/crm/components/Brand";

/* ── Math ────────────────────────────────────────────────────────────── */
export const marginPct = (cost: number, sell: number) => (sell > 0 ? ((sell - cost) / sell) * 100 : 0);
export const markupPct = (cost: number, sell: number) => (cost > 0 ? ((sell - cost) / cost) * 100 : 0);
export const sellFromMargin = (cost: number, margin: number) =>
  margin < 100 ? cost / (1 - margin / 100) : 0;
export const sellFromMarkup = (cost: number, markup: number) => cost * (1 + markup / 100);

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

const num = (s: string) => {
  const v = parseFloat(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(v) ? v : 0;
};

/* Quick reference — typical margins for pool / water treatment work. */
export const MARGIN_BENCHMARKS = [
  { category: "Equipment (pumps, filters)", margin: "40–50%", markup: "67–100%", note: "Higher for premium brands" },
  { category: "Chemicals", margin: "45–55%", markup: "82–122%", note: "Volume pricing helps" },
  { category: "Labor / service calls", margin: "50–65%", markup: "100–186%", note: "Includes overhead" },
  { category: "Repairs & parts", margin: "40–60%", markup: "67–150%", note: "Varies by part cost" },
  { category: "Pool builds / renovations", margin: "25–40%", markup: "33–67%", note: "Large project overhead" },
];

type Mode = "sell" | "margin" | "markup" | "multi";

const MODES: { id: Mode; label: string; icon: typeof Percent }[] = [
  { id: "sell", label: "Selling price", icon: Calculator },
  { id: "margin", label: "Margin %", icon: Percent },
  { id: "markup", label: "Markup", icon: TrendingUp },
  { id: "multi", label: "Multi-item", icon: Package },
];

type Line = { id: string; name: string; cost: string; qty: string; margin: string };

const newLine = (): Line => ({ id: crypto.randomUUID(), name: "", cost: "", qty: "1", margin: "50" });

function Field({
  label,
  prefix,
  suffix,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  prefix?: string;
  suffix?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <div className="ss-tag" style={{ fontSize: "0.58rem" }}>{label}</div>
      <div className="mt-1 flex items-center gap-1.5">
        {prefix && <span className="ss-num opacity-50">{prefix}</span>}
        <input
          className="ss-input w-full"
          inputMode="decimal"
          value={value}
          placeholder={placeholder ?? "0.00"}
          onChange={(e) => onChange(e.target.value)}
        />
        {suffix && <span className="ss-num opacity-50">{suffix}</span>}
      </div>
    </label>
  );
}

function Result({ label, big, sub }: { label: string; big: string; sub?: string }) {
  return (
    <div className="ss-hero p-4">
      <div className="ss-tag" style={{ fontSize: "0.58rem", color: "rgba(255,255,255,.72)" }}>{label}</div>
      <div className="ss-num mt-1 text-[2.4rem] font-bold leading-none">{big}</div>
      {sub && <div className="mt-1 text-[0.78rem]" style={{ color: "rgba(255,255,255,.75)" }}>{sub}</div>}
    </div>
  );
}

export default function MarginCalculator({ compact = false }: { compact?: boolean }) {
  const [mode, setMode] = useState<Mode>("sell");
  const [cost, setCost] = useState("");
  const [margin, setMargin] = useState("50");
  const [markup, setMarkup] = useState("100");
  const [sell, setSell] = useState("");
  const [lines, setLines] = useState<Line[]>([newLine()]);
  // Labor, service fees and tax so a full parts-and-services quote shows true job margin.
  const [laborHours, setLaborHours] = useState("2");
  const [laborCostRate, setLaborCostRate] = useState("28");
  const [laborBillRate, setLaborBillRate] = useState("95");
  const [feeCostAmt, setFeeCostAmt] = useState("0");
  const [feeChargeAmt, setFeeChargeAmt] = useState("0");
  const [taxRate, setTaxRate] = useState("8.25");
  const [taxLabor, setTaxLabor] = useState(false);

  const c = num(cost);

  const single = useMemo(() => {
    if (mode === "margin") {
      const s = num(sell);
      return { cost: c, sell: s, margin: marginPct(c, s), markup: markupPct(c, s), profit: s - c };
    }
    if (mode === "markup") {
      const s = sellFromMarkup(c, num(markup));
      return { cost: c, sell: s, margin: marginPct(c, s), markup: num(markup), profit: s - c };
    }
    const s = sellFromMargin(c, num(margin));
    return { cost: c, sell: s, margin: num(margin), markup: markupPct(c, s), profit: s - c };
  }, [mode, c, margin, markup, sell]);

  const multi = useMemo(() => {
    const rows = lines.map((l) => {
      const lc = num(l.cost) * Math.max(1, num(l.qty) || 1);
      const ls = sellFromMargin(num(l.cost), num(l.margin)) * Math.max(1, num(l.qty) || 1);
      return { ...l, lineCost: lc, lineSell: ls, profit: ls - lc };
    });
    const partsCost = rows.reduce((a, r) => a + r.lineCost, 0);
    const partsSell = rows.reduce((a, r) => a + r.lineSell, 0);

    // Labor is billed by the hour: your loaded cost vs. what the customer pays.
    const hrs = num(laborHours);
    const laborCost = hrs * num(laborCostRate);
    const laborSell = hrs * num(laborBillRate);

    // Service / trip fees are usually near-pure margin but can carry a cost.
    const feeCost = num(feeCostAmt);
    const feeSell = num(feeChargeAmt);

    const totalCost = partsCost + laborCost + feeCost;
    const preTaxTotal = partsSell + laborSell + feeSell;

    // Sales tax is a pass-through — it never counts toward margin.
    const taxBase = taxLabor ? preTaxTotal : partsSell;
    const tax = taxBase * (num(taxRate) / 100);
    const customerTotal = preTaxTotal + tax;

    return {
      rows,
      partsCost, partsSell,
      laborCost, laborSell, laborMargin: marginPct(laborCost, laborSell),
      feeCost, feeSell,
      totalCost,
      totalSell: preTaxTotal,
      tax, taxBase, customerTotal,
      profit: preTaxTotal - totalCost,
      margin: marginPct(totalCost, preTaxTotal),
    };
  }, [lines, laborHours, laborCostRate, laborBillRate, feeCostAmt, feeChargeAmt, taxRate, taxLabor]);

  return (
    <div className="space-y-4">
      {/* Mode switch */}
      <div className="flex flex-wrap gap-1 rounded-lg p-1" style={{ background: "hsl(var(--ss-ink) / 0.05)" }}>
        {MODES.map((m) => {
          const Icon = m.icon;
          const active = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[0.8rem] font-semibold transition"
              style={
                active
                  ? { background: "hsl(var(--ss-burgundy))", color: "hsl(var(--ss-cream))" }
                  : { opacity: 0.6 }
              }
            >
              <Icon size={14} />
              {m.label}
            </button>
          );
        })}
      </div>

      {mode !== "multi" ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="ss-card space-y-3 p-4">
            <div className="text-[0.8rem] opacity-70">
              {mode === "sell" && "Enter your cost and the margin you want — we return the price to charge."}
              {mode === "margin" && "Enter cost and the price you charge — we return the margin you're actually making."}
              {mode === "markup" && "Enter cost and markup on cost — we return the price and the true margin."}
            </div>
            <Field label="Product / service cost" prefix="$" value={cost} onChange={setCost} />
            {mode === "sell" && (
              <>
                <Field label="Desired margin %" suffix="%" value={margin} onChange={setMargin} />
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={1}
                  value={num(margin)}
                  onChange={(e) => setMargin(e.target.value)}
                  className="w-full"
                />
                <div className="flex flex-wrap gap-1">
                  {[35, 40, 45, 50, 55, 60, 65].map((p) => (
                    <button key={p} className="ss-chip" onClick={() => setMargin(String(p))}>
                      {p}%
                    </button>
                  ))}
                </div>
              </>
            )}
            {mode === "margin" && <Field label="Selling price" prefix="$" value={sell} onChange={setSell} />}
            {mode === "markup" && <Field label="Markup on cost %" suffix="%" value={markup} onChange={setMarkup} />}
          </div>

          <div className="space-y-2">
            <Result
              label={mode === "margin" ? "Your margin" : "Charge this price"}
              big={
                mode === "margin"
                  ? `${single.margin.toFixed(1)}%`
                  : money(Number.isFinite(single.sell) ? single.sell : 0)
              }
              sub={
                mode === "margin"
                  ? `Markup ${single.markup.toFixed(1)}% · profit ${money(single.profit)}`
                  : `Margin ${single.margin.toFixed(1)}% · markup ${single.markup.toFixed(1)}%`
              }
            />
            <div className="grid grid-cols-3 gap-2">
              <div className="ss-card p-3">
                <div className="ss-tag" style={{ fontSize: "0.55rem" }}>Cost</div>
                <div className="ss-num text-[1.05rem] font-bold">{money(single.cost)}</div>
              </div>
              <div className="ss-card p-3">
                <div className="ss-tag" style={{ fontSize: "0.55rem" }}>Price</div>
                <div className="ss-num text-[1.05rem] font-bold">{money(single.sell || 0)}</div>
              </div>
              <div className="ss-card p-3">
                <div className="ss-tag" style={{ fontSize: "0.55rem" }}>Profit</div>
                <div className="ss-num text-[1.05rem] font-bold" style={{ color: "hsl(var(--ss-green))" }}>
                  {money(single.profit || 0)}
                </div>
              </div>
            </div>
            {single.margin > 0 && single.margin < 30 && (
              <Chip tone="orange">Thin margin — most pool work should clear 40%+</Chip>
            )}
            {single.margin >= 50 && <Chip tone="green">Healthy margin</Chip>}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {multi.rows.map((r, i) => (
            <div key={r.id} className="ss-card grid gap-2 p-3 md:grid-cols-[1.6fr_1fr_.6fr_.8fr_auto] md:items-end">
              <label className="block">
                <div className="ss-tag" style={{ fontSize: "0.55rem" }}>Item</div>
                <input
                  className="ss-input mt-1 w-full"
                  placeholder={`Pump, chlorine tabs, labor…`}
                  value={r.name}
                  onChange={(e) =>
                    setLines((l) => l.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                  }
                />
              </label>
              <Field
                label="Unit cost"
                prefix="$"
                value={r.cost}
                onChange={(v) => setLines((l) => l.map((x, j) => (j === i ? { ...x, cost: v } : x)))}
              />
              <Field
                label="Qty"
                value={r.qty}
                placeholder="1"
                onChange={(v) => setLines((l) => l.map((x, j) => (j === i ? { ...x, qty: v } : x)))}
              />
              <Field
                label="Margin"
                suffix="%"
                value={r.margin}
                onChange={(v) => setLines((l) => l.map((x, j) => (j === i ? { ...x, margin: v } : x)))}
              />
              <div className="flex items-center gap-2 pb-1">
                <div className="text-right">
                  <div className="ss-tag" style={{ fontSize: "0.55rem" }}>Price</div>
                  <div className="ss-num font-bold">{money(r.lineSell || 0)}</div>
                </div>
                {multi.rows.length > 1 && (
                  <button
                    className="ss-chip"
                    aria-label="Remove item"
                    onClick={() => setLines((l) => l.filter((_, j) => j !== i))}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
          <button className="ss-btn ss-btn-ghost" onClick={() => setLines((l) => [...l, newLine()])}>
            <Plus size={14} className="mr-1 inline" /> Add item
          </button>

          <div className="grid gap-2 md:grid-cols-4">
            <Result label="Quote total" big={money(multi.totalSell)} sub={`Blended margin ${multi.margin.toFixed(1)}%`} />
            <div className="ss-card p-3">
              <div className="ss-tag" style={{ fontSize: "0.55rem" }}>Total cost</div>
              <div className="ss-num text-[1.2rem] font-bold">{money(multi.totalCost)}</div>
            </div>
            <div className="ss-card p-3">
              <div className="ss-tag" style={{ fontSize: "0.55rem" }}>Gross profit</div>
              <div className="ss-num text-[1.2rem] font-bold" style={{ color: "hsl(var(--ss-green))" }}>
                {money(multi.profit)}
              </div>
            </div>
            <div className="ss-card p-3">
              <div className="ss-tag" style={{ fontSize: "0.55rem" }}>Items</div>
              <div className="ss-num text-[1.2rem] font-bold">{multi.rows.length}</div>
            </div>
          </div>
        </div>
      )}

      {!compact && (
        <div className="ss-card overflow-x-auto p-0">
          <div className="p-3 pb-1 text-[0.9rem] font-semibold" style={{ color: "hsl(var(--ss-burgundy))" }}>
            Quick reference — common water treatment margins
          </div>
          <table className="w-full text-left text-[0.8rem]">
            <thead>
              <tr style={{ background: "hsl(var(--ss-ink) / 0.05)" }}>
                <th className="p-2.5">Category</th>
                <th className="p-2.5">Typical margin</th>
                <th className="p-2.5">Equivalent markup</th>
                <th className="p-2.5">Notes</th>
              </tr>
            </thead>
            <tbody>
              {MARGIN_BENCHMARKS.map((b) => (
                <tr key={b.category} className="border-t" style={{ borderColor: "hsl(var(--ss-ink) / 0.08)" }}>
                  <td className="p-2.5 font-semibold">{b.category}</td>
                  <td className="ss-num p-2.5" style={{ color: "hsl(var(--ss-burgundy))" }}>{b.margin}</td>
                  <td className="ss-num p-2.5" style={{ color: "hsl(var(--ss-burgundy))" }}>{b.markup}</td>
                  <td className="p-2.5 opacity-70">{b.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="p-3 text-[0.78rem] opacity-75">
            <strong>Formulas:</strong> Margin = (Price − Cost) ÷ Price · Markup = (Price − Cost) ÷ Cost
          </div>
        </div>
      )}
    </div>
  );
}
