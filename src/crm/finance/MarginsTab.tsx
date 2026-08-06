import { useEffect, useState } from "react";
import { Chip } from "@/crm/components/Brand";
import { money } from "@/crm/lib/pricingEngine";
import { useRateCard } from "@/crm/lib/pricingEngine";
import {
  CostModel,
  DEFAULT_COSTS,
  loadCosts,
  maintenanceMargin,
  saveCosts,
  serviceMargin,
} from "@/crm/lib/estimateEngine";

const FIELDS: { key: keyof CostModel; label: string; suffix?: string; group: string }[] = [
  { key: "visitsPerMonth", label: "Visits per month", group: "Maintenance" },
  { key: "techPayPerVisit", label: "Tech pay / visit", suffix: "$", group: "Maintenance" },
  { key: "chemCostPerVisit", label: "Chemicals / visit", suffix: "$", group: "Maintenance" },
  { key: "fuelPerVisit", label: "Fuel & drive / visit", suffix: "$", group: "Maintenance" },
  { key: "overheadPerPoolMonth", label: "Overhead / pool / mo", suffix: "$", group: "Maintenance" },
  { key: "serviceLaborCostHr", label: "Labor cost / hr", suffix: "$", group: "Service & repair" },
  { key: "serviceBillRateHr", label: "Billed rate / hr", suffix: "$", group: "Service & repair" },
  { key: "servicePartsMarginPct", label: "Default parts margin", suffix: "%", group: "Service & repair" },
  { key: "serviceTripFee", label: "Trip fee charged", suffix: "$", group: "Service & repair" },
  { key: "serviceTripCost", label: "Trip fee cost", suffix: "$", group: "Service & repair" },
  { key: "processingFeePct", label: "Card processing", suffix: "%", group: "Shared" },
  { key: "taxRatePct", label: "Sales tax", suffix: "%", group: "Shared" },
];

const GROUPS = ["Maintenance", "Service & repair", "Shared"];

/** Cost model + margin visibility for every estimate type. */
export default function MarginsTab() {
  const [costs, setCosts] = useState<CostModel>(() => loadCosts());
  const { cities } = useRateCard();

  useEffect(() => {
    saveCosts(costs);
  }, [costs]);

  const set = (k: keyof CostModel, v: number) => setCosts((c) => ({ ...c, [k]: v }));

  const sample = [129, 159, 189, 219, 249, 289];
  const jobSample = [
    { label: "Filter cartridge swap", cost: 120, hours: 1 },
    { label: "Pump motor replacement", cost: 380, hours: 2.5 },
    { label: "Salt cell replacement", cost: 520, hours: 1.5 },
    { label: "Green-pool recovery", cost: 95, hours: 4 },
  ];

  return (
    <div className="space-y-4">
      <div className="ss-card p-4">
        <div className="mb-1 text-[1rem] font-semibold" style={{ color: "hsl(var(--ss-burgundy))" }}>
          Cost model
        </div>
        <div className="mb-3 text-[0.82rem] opacity-70">
          These inputs drive margin everywhere — Savvy Estimate (maintenance and service), job
          pricing and the reports below. Change one number and every quote re-prices instantly.
        </div>
        {GROUPS.map((g) => (
          <div key={g} className="mb-3">
            <div className="ss-label mb-1.5">{g}</div>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {FIELDS.filter((f) => f.group === g).map((f) => (
                <div key={f.key}>
                  <label className="ss-label">
                    {f.label} {f.suffix ? `(${f.suffix})` : ""}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    className="ss-input ss-num"
                    value={costs[f.key]}
                    onChange={(e) => set(f.key, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
        <button className="ss-btn ss-btn-ghost" onClick={() => setCosts(DEFAULT_COSTS)}>
          RESET TO DEFAULTS
        </button>
      </div>

      <div className="ss-card overflow-x-auto p-0">
        <div className="p-3 pb-1 text-[0.95rem] font-semibold" style={{ color: "hsl(var(--ss-burgundy))" }}>
          Maintenance margin by monthly price
        </div>
        <table className="w-full text-left text-[0.8rem]">
          <thead>
            <tr style={{ background: "hsl(var(--ss-ink) / 0.05)" }}>
              <th className="p-2.5">Monthly price</th>
              <th className="p-2.5">Monthly cost</th>
              <th className="p-2.5">Profit / mo</th>
              <th className="p-2.5">Margin</th>
              <th className="p-2.5">Annual / pool</th>
            </tr>
          </thead>
          <tbody>
            {sample.map((p) => {
              const m = maintenanceMargin(p, costs);
              return (
                <tr key={p} className="border-t" style={{ borderColor: "hsl(var(--ss-ink) / 0.08)" }}>
                  <td className="ss-num p-2.5 font-semibold">{money(p)}</td>
                  <td className="ss-num p-2.5">{money(m.monthlyCost)}</td>
                  <td className="ss-num p-2.5">{money(m.grossProfit)}</td>
                  <td className="p-2.5">
                    <Chip tone={m.marginPct >= 45 ? "green" : m.marginPct >= 30 ? "gold" : "orange"}>
                      {m.marginPct.toFixed(1)}%
                    </Chip>
                  </td>
                  <td className="ss-num p-2.5">{money(m.annualProfit)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {cities.length > 0 && (
        <div className="ss-card overflow-x-auto p-0">
          <div className="p-3 pb-1 text-[0.95rem] font-semibold" style={{ color: "hsl(var(--ss-burgundy))" }}>
            Margin by city band
          </div>
          <table className="w-full text-left text-[0.8rem]">
            <thead>
              <tr style={{ background: "hsl(var(--ss-ink) / 0.05)" }}>
                <th className="p-2.5">City</th>
                <th className="p-2.5">Low rate</th>
                <th className="p-2.5">Margin at low</th>
                <th className="p-2.5">High rate</th>
                <th className="p-2.5">Margin at high</th>
              </tr>
            </thead>
            <tbody>
              {cities.map((c) => {
                const lo = maintenanceMargin(c.low, costs);
                const hi = maintenanceMargin(c.high, costs);
                return (
                  <tr key={c.id} className="border-t" style={{ borderColor: "hsl(var(--ss-ink) / 0.08)" }}>
                    <td className="p-2.5 font-semibold">{c.city}</td>
                    <td className="ss-num p-2.5">{money(c.low)}</td>
                    <td className="p-2.5">
                      <Chip tone={lo.marginPct >= 45 ? "green" : lo.marginPct >= 30 ? "gold" : "orange"}>
                        {lo.marginPct.toFixed(1)}%
                      </Chip>
                    </td>
                    <td className="ss-num p-2.5">{money(c.high)}</td>
                    <td className="p-2.5">
                      <Chip tone={hi.marginPct >= 45 ? "green" : hi.marginPct >= 30 ? "gold" : "orange"}>
                        {hi.marginPct.toFixed(1)}%
                      </Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="ss-card overflow-x-auto p-0">
        <div className="p-3 pb-1 text-[0.95rem] font-semibold" style={{ color: "hsl(var(--ss-burgundy))" }}>
          Service &amp; repair margin — typical jobs
        </div>
        <table className="w-full text-left text-[0.8rem]">
          <thead>
            <tr style={{ background: "hsl(var(--ss-ink) / 0.05)" }}>
              <th className="p-2.5">Job</th>
              <th className="p-2.5">Job cost</th>
              <th className="p-2.5">Customer subtotal</th>
              <th className="p-2.5">Profit</th>
              <th className="p-2.5">Margin</th>
            </tr>
          </thead>
          <tbody>
            {jobSample.map((j) => {
              const m = serviceMargin(
                [{ id: j.label, name: j.label, cost: j.cost, qty: 1, marginPct: costs.servicePartsMarginPct }],
                j.hours,
                costs,
                { includeTrip: true, taxLabor: false },
              );
              return (
                <tr key={j.label} className="border-t" style={{ borderColor: "hsl(var(--ss-ink) / 0.08)" }}>
                  <td className="p-2.5 font-semibold">
                    {j.label}
                    <span className="opacity-60"> · {j.hours}h</span>
                  </td>
                  <td className="ss-num p-2.5">{money(m.totalCost)}</td>
                  <td className="ss-num p-2.5">{money(m.subtotal)}</td>
                  <td className="ss-num p-2.5">{money(m.profit)}</td>
                  <td className="p-2.5">
                    <Chip tone={m.marginPct >= 45 ? "green" : m.marginPct >= 30 ? "gold" : "orange"}>
                      {m.marginPct.toFixed(1)}%
                    </Chip>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="p-3 text-[0.78rem] opacity-70">
          Maintenance and service price on separate models — recurring pools carry chemicals and
          route cost per visit, repairs carry parts and hourly labor.
        </div>
      </div>
    </div>
  );
}
