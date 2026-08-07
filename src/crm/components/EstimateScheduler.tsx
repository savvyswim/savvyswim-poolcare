import { useEffect, useState } from "react";
import { CalendarClock, Plus, Receipt, Trash2 } from "lucide-react";
import { Chip } from "@/crm/components/Brand";
import { money } from "@/crm/lib/pricingEngine";
import {
import { bundleTotal, useBundles } from "@/crm/lib/bundles";
  BillingType,
  CostModel,
  DEFAULT_RECURRENCE,
  FREQUENCIES,
  Frequency,
  InvoiceFrequency,
  Recurrence,
  ServiceLine,
  buildSchedule,
  fmtDate,
  loadCosts,
  maintenanceMargin,
  serviceMargin,
} from "@/crm/lib/estimateEngine";

/** Live cost model shared with Savvy Ledger → Margins. */
export function useCostModel(): CostModel {
  const [costs, setCosts] = useState<CostModel>(() => loadCosts());
  useEffect(() => {
    const sync = () => setCosts(loadCosts());
    window.addEventListener("ss-costs-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("ss-costs-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return costs;
}

function MarginBar({ pct }: { pct: number }) {
  const tone = pct >= 45 ? "var(--ss-green)" : pct >= 30 ? "var(--ss-gold)" : "var(--ss-burgundy)";
  return (
    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "hsl(var(--ss-ink) / 0.08)" }}>
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: `hsl(${tone})` }}
      />
    </div>
  );
}

/* ── Maintenance: recurring visits, billing schedule and live margin ── */
export function MaintenanceSchedule({ monthly }: { monthly: number }) {
  const costs = useCostModel();
  const [r, setR] = useState<Recurrence>(DEFAULT_RECURRENCE);
  const [billing, setBilling] = useState<BillingType>("visit_based");
  const [invoiceFreq, setInvoiceFreq] = useState<InvoiceFrequency>("monthly_last");

  const set = <K extends keyof Recurrence>(k: K, v: Recurrence[K]) => setR((p) => ({ ...p, [k]: v }));
  const sched = buildSchedule(r, invoiceFreq);
  const m = maintenanceMargin(monthly, { ...costs, visitsPerMonth: sched.perMonth });
  const months = sched.perMonth > 0 ? sched.count / sched.perMonth : 0;
  const contractValue = monthly * Math.max(1, months);
  const perInvoice = sched.invoices > 0 ? contractValue / sched.invoices : contractValue;

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="ss-card p-4">
        <div className="ss-label mb-2 flex items-center gap-1.5">
          <CalendarClock size={13} /> Visits · recurring schedule
        </div>

        <div className="mb-3 rounded-md border p-3" style={{ borderColor: "hsl(var(--ss-sand))" }}>
          <div className="flex items-center justify-between text-[0.85rem] font-bold">
            <span>
              {fmtDate(sched.first)} – {fmtDate(sched.last)}
            </span>
            <span className="ss-num">{sched.count} visits</span>
          </div>
          <div className="mt-1 text-[0.72rem] opacity-70">
            Repeats {FREQUENCIES.find((f) => f.id === r.frequency)?.label.toLowerCase()}
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <div>
            <label className="ss-label">Start date</label>
            <input
              type="date"
              className="ss-input"
              value={r.startDate}
              onChange={(e) => set("startDate", e.target.value)}
            />
          </div>
          <div>
            <label className="ss-label">Repeats</label>
            <select
              className="ss-input"
              value={r.frequency}
              onChange={(e) => set("frequency", e.target.value as Frequency)}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="ss-label">Start time</label>
            <input
              type="time"
              className="ss-input"
              disabled={r.anytime}
              value={r.startTime}
              onChange={(e) => set("startTime", e.target.value)}
            />
          </div>
          <div>
            <label className="ss-label">End time</label>
            <input
              type="time"
              className="ss-input"
              disabled={r.anytime}
              value={r.endTime}
              onChange={(e) => set("endTime", e.target.value)}
            />
          </div>
        </div>

        <label className="mt-2 flex items-center gap-2 text-[0.78rem]">
          <input type="checkbox" checked={r.anytime} onChange={(e) => set("anytime", e.target.checked)} />
          Anytime
        </label>

        <div className="mt-3 space-y-2">
          <label className="flex items-center gap-2 text-[0.82rem] font-semibold">
            <input
              type="radio"
              checked={r.endMode === "after"}
              onChange={() => set("endMode", "after")}
            />
            Ends after
          </label>
          <div className="grid gap-2 sm:grid-cols-2">
            <input
              type="number"
              min={1}
              className="ss-input ss-num"
              disabled={r.endMode !== "after"}
              value={r.endAfter}
              onChange={(e) => set("endAfter", Number(e.target.value))}
            />
            <select
              className="ss-input"
              disabled={r.endMode !== "after"}
              value={r.endUnit}
              onChange={(e) => set("endUnit", e.target.value as Recurrence["endUnit"])}
            >
              <option value="visits">Visits</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
          </div>
          <label className="flex items-center gap-2 text-[0.82rem] font-semibold">
            <input type="radio" checked={r.endMode === "on"} onChange={() => set("endMode", "on")} />
            Ends on
          </label>
          <input
            type="date"
            className="ss-input"
            disabled={r.endMode !== "on"}
            value={r.endOn}
            onChange={(e) => set("endOn", e.target.value)}
          />
        </div>

        <div className="mt-3">
          <label className="ss-label">Visit instructions</label>
          <textarea
            className="ss-input"
            rows={3}
            value={r.instructions}
            onChange={(e) => set("instructions", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="ss-card p-4">
          <div className="ss-label mb-2 flex items-center gap-1.5">
            <Receipt size={13} /> Billing
          </div>
          <div className="space-y-2 text-[0.82rem]">
            <label className="flex gap-2">
              <input
                type="radio"
                checked={billing === "visit_based"}
                onChange={() => setBilling("visit_based")}
              />
              <span>
                <strong>Visit based</strong>
                <div className="text-[0.72rem] opacity-70">
                  Visits are listed as billable items and grouped on one invoice.
                </div>
              </span>
            </label>
            <label className="flex gap-2">
              <input
                type="radio"
                checked={billing === "fixed_price"}
                onChange={() => setBilling("fixed_price")}
              />
              <span>
                <strong>Fixed price</strong>
                <div className="text-[0.72rem] opacity-70">Each invoice is for a set amount.</div>
              </span>
            </label>
          </div>
          <div className="mt-3">
            <label className="ss-label">Invoice frequency</label>
            <select
              className="ss-input"
              value={invoiceFreq}
              onChange={(e) => setInvoiceFreq(e.target.value as InvoiceFrequency)}
            >
              <option value="monthly_last">Monthly on the last day of the month</option>
              <option value="monthly_first">Monthly on the first day of the month</option>
              <option value="per_visit">After each visit</option>
              <option value="on_completion">Once, when the job is complete</option>
            </select>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="ss-label">Invoices</div>
              <div className="ss-num text-[1.05rem] font-bold">{sched.invoices}</div>
            </div>
            <div>
              <div className="ss-label">Per invoice</div>
              <div className="ss-num text-[1.05rem] font-bold">
                {money(perInvoice)}
              </div>
            </div>

            <div>
              <div className="ss-label">Contract value</div>
              <div className="ss-num text-[1.05rem] font-bold">{money(contractValue)}</div>
            </div>
          </div>
        </div>

        <div className="ss-card p-4">
          <div className="ss-label mb-2">Maintenance margin · internal only</div>
          <div className="flex items-end justify-between">
            <div>
              <div className="ss-num text-[1.8rem] font-bold leading-none">{m.marginPct.toFixed(1)}%</div>
              <div className="text-[0.75rem] opacity-70">
                {money(m.grossProfit)}/mo profit · {money(m.perVisitProfit)} per visit
              </div>
            </div>
            <Chip tone={m.marginPct >= 45 ? "green" : m.marginPct >= 30 ? "gold" : "orange"}>
              {m.marginPct >= 45 ? "Healthy" : m.marginPct >= 30 ? "Watch" : "Too thin"}
            </Chip>
          </div>
          <MarginBar pct={m.marginPct} />
          <div className="mt-3 space-y-1 text-[0.78rem]">
            {m.costBreakdown.map((l) => (
              <div key={l.label} className="flex justify-between">
                <span className="opacity-75">{l.label}</span>
                <span className="ss-num">{money(l.amount)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-1 font-semibold" style={{ borderColor: "hsl(var(--ss-ink) / 0.1)" }}>
              <span>Monthly cost</span>
              <span className="ss-num">{money(m.monthlyCost)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Annual profit / pool</span>
              <span className="ss-num">{money(m.annualProfit)}</span>
            </div>
          </div>
          <div className="mt-2 text-[0.7rem] opacity-60">
            Cost inputs are set in Savvy Ledger → Margins. Customers never see these numbers.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Service: one-off repair job pricing with parts + labor margin ──── */
const newLine = (): ServiceLine => ({
  id: crypto.randomUUID(),
  name: "",
  cost: 0,
  qty: 1,
  marginPct: 45,
});

export function ServiceEstimate() {
  const { rows: bundles } = useBundles(true);
  const costs = useCostModel();
  const [lines, setLines] = useState<ServiceLine[]>([newLine()]);
  const [hours, setHours] = useState(2);
  const [includeTrip, setIncludeTrip] = useState(true);
  const [taxLabor, setTaxLabor] = useState(false);
  const [laborPrice, setLaborPrice] = useState(190);

  const m = serviceMargin(lines, hours, costs, { includeTrip, taxLabor, laborPrice });

  const upd = (i: number, patch: Partial<ServiceLine>) =>
    setLines((l) => l.map((x, j) => (j === i ? { ...x, ...patch } : x)));

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="ss-card p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="ss-label">Repair / service job — parts &amp; labor</div>
          {bundles.length > 0 && (
            <select
              className="ss-input w-[210px]"
              value=""
              onChange={(e) => {
                const b = bundles.find((x) => x.id === e.target.value);
                if (!b) return;
                /* A bundle drops in as its items — fixed-price bundles collapse to one line. */
                const added: ServiceLine[] =
                  b.price_mode === "fixed"
                    ? [{ id: `${b.id}-pkg`, name: b.name, cost: bundleTotal(b), qty: 1, marginPct: 0 }]
                    : b.items.map((i, n) => ({
                        id: `${b.id}-${n}`,
                        name: i.name,
                        cost: i.price,
                        qty: i.qty,
                        marginPct: 0,
                      }));
                setLines((l) => [...l.filter((x) => x.name.trim() || x.cost), ...added]);
              }}
            >
              <option value="">Apply a bundle…</option>
              {bundles.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={l.id} className="grid gap-2 sm:grid-cols-[1.6fr_.9fr_.5fr_.7fr_auto] sm:items-end">
              <div>
                <label className="ss-label">Part / item</label>
                <input
                  className="ss-input"
                  placeholder="Pump motor, filter cartridge…"
                  value={l.name}
                  onChange={(e) => upd(i, { name: e.target.value })}
                />
              </div>
              <div>
                <label className="ss-label">Your cost</label>
                <input
                  type="number"
                  className="ss-input ss-num"
                  value={l.cost || ""}
                  onChange={(e) => upd(i, { cost: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="ss-label">Qty</label>
                <input
                  type="number"
                  min={1}
                  className="ss-input ss-num"
                  value={l.qty}
                  onChange={(e) => upd(i, { qty: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="ss-label">Margin %</label>
                <input
                  type="number"
                  className="ss-input ss-num"
                  value={l.marginPct}
                  onChange={(e) => upd(i, { marginPct: Number(e.target.value) })}
                />
              </div>
              {lines.length > 1 && (
                <button
                  className="ss-chip mb-1"
                  aria-label="Remove line"
                  onClick={() => setLines((x) => x.filter((_, j) => j !== i))}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
        <button className="ss-btn ss-btn-ghost mt-2" onClick={() => setLines((l) => [...l, newLine()])}>
          <Plus size={13} className="mr-1 inline" /> Add part
        </button>

        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          <div>
            <label className="ss-label">Labor price</label>
            <input
              type="number"
              step="5"
              min={0}
              className="ss-input ss-num"
              value={laborPrice}
              onChange={(e) => setLaborPrice(Number(e.target.value))}
            />
            <div className="mt-1 text-[0.68rem] opacity-60">What the customer is charged for labor.</div>
          </div>
          <div>
            <label className="ss-label">Time on site (hrs)</label>
            <input
              type="number"
              step="0.25"
              min={0}
              className="ss-input ss-num"
              value={hours}
              onChange={(e) => setHours(Number(e.target.value))}
            />
            <div className="mt-1 text-[0.68rem] opacity-60">
              Tracking only — how long the service takes. Doesn’t change the price.
            </div>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap gap-3 text-[0.78rem]">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={includeTrip} onChange={(e) => setIncludeTrip(e.target.checked)} />
            Trip / diagnostic fee ({money(costs.serviceTripFee)})
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={taxLabor} onChange={(e) => setTaxLabor(e.target.checked)} />
            Tax labor &amp; fees too
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <div className="ss-hero p-4">
          <div className="ss-tag" style={{ fontSize: "0.55rem", color: "rgba(255,255,255,.7)" }}>
            Customer total
          </div>
          <div className="ss-num mt-1 text-[2rem] font-bold leading-none">{money(m.customerTotal)}</div>
          <div className="mt-2 text-[0.78rem] opacity-85">
            Subtotal {money(m.subtotal)} + tax {money(m.tax)}
          </div>
        </div>

        <div className="ss-card p-4">
          <div className="ss-label mb-2">Job margin · internal only</div>
          <div className="ss-num text-[1.8rem] font-bold leading-none">{m.marginPct.toFixed(1)}%</div>
          <div className="text-[0.75rem] opacity-70">{money(m.profit)} profit on this job</div>
          <MarginBar pct={m.marginPct} />
          <div className="mt-3 space-y-1 text-[0.78rem]">
            <div className="flex justify-between">
              <span className="opacity-75">Parts</span>
              <span className="ss-num">
                {money(m.partsSell)} · cost {money(m.partsCost)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-75">Labor {hours}h</span>
              <span className="ss-num">
                {money(m.laborSell)} · cost {money(m.laborCost)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="opacity-75">Trip fee</span>
              <span className="ss-num">
                {money(m.feeSell)} · cost {money(m.feeCost)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold" style={{ borderColor: "hsl(var(--ss-ink) / 0.1)" }}>
              <span>Job cost</span>
              <span className="ss-num">{money(m.totalCost)}</span>
            </div>
          </div>
          <div className="mt-2 text-[0.7rem] opacity-60">
            Labor and trip-fee costs come from Savvy Ledger → Margins.
          </div>
        </div>
      </div>
    </div>
  );
}
