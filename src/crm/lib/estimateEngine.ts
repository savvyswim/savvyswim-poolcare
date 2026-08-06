/**
 * Estimate engine — shared by Savvy Estimate and Savvy Ledger.
 *
 * Two estimate kinds:
 *  - "maintenance" → recurring pool care, priced monthly, billed on a schedule
 *  - "service"     → one-off repair / job, priced per visit with parts + labor
 *
 * The cost model below is the single source of truth for margin on both sides,
 * so a rate quoted in the estimate shows the exact same margin in Finance.
 */

export type EstimateKind = "maintenance" | "service";

export type CostModel = {
  /* Maintenance — cost per visit unless noted */
  visitsPerMonth: number;
  techPayPerVisit: number;
  chemCostPerVisit: number;
  fuelPerVisit: number;
  overheadPerPoolMonth: number;
  /* Service (one-off jobs) */
  serviceLaborCostHr: number;
  serviceBillRateHr: number;
  servicePartsMarginPct: number;
  serviceTripFee: number;
  serviceTripCost: number;
  /* Shared */
  processingFeePct: number;
  taxRatePct: number;
};

export const DEFAULT_COSTS: CostModel = {
  visitsPerMonth: 4.33,
  techPayPerVisit: 22,
  chemCostPerVisit: 11,
  fuelPerVisit: 4,
  overheadPerPoolMonth: 18,
  serviceLaborCostHr: 28,
  serviceBillRateHr: 95,
  servicePartsMarginPct: 45,
  serviceTripFee: 89,
  serviceTripCost: 12,
  processingFeePct: 2.9,
  taxRatePct: 8.25,
};

const KEY = "ss_estimate_costs_v1";

export function loadCosts(): CostModel {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_COSTS;
    return { ...DEFAULT_COSTS, ...(JSON.parse(raw) as Partial<CostModel>) };
  } catch {
    return DEFAULT_COSTS;
  }
}

export function saveCosts(c: CostModel) {
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
    window.dispatchEvent(new CustomEvent("ss-costs-changed"));
  } catch {
    /* storage unavailable — margins still compute from defaults */
  }
}

export const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);

/* ── Maintenance margin ─────────────────────────────────────────────── */
export type MaintenanceMargin = {
  monthlyPrice: number;
  perVisitCost: number;
  monthlyCost: number;
  costBreakdown: { label: string; amount: number }[];
  grossProfit: number;
  marginPct: number;
  perVisitProfit: number;
  annualProfit: number;
  processingFee: number;
};

export function maintenanceMargin(monthlyPrice: number, c: CostModel): MaintenanceMargin {
  const visits = Math.max(0.1, c.visitsPerMonth);
  const perVisitCost = c.techPayPerVisit + c.chemCostPerVisit + c.fuelPerVisit;
  const processingFee = monthlyPrice * (c.processingFeePct / 100);
  const monthlyCost = perVisitCost * visits + c.overheadPerPoolMonth + processingFee;
  const grossProfit = monthlyPrice - monthlyCost;
  return {
    monthlyPrice,
    perVisitCost,
    monthlyCost,
    costBreakdown: [
      { label: `Tech pay · ${visits.toFixed(2)} visits`, amount: c.techPayPerVisit * visits },
      { label: "Chemicals", amount: c.chemCostPerVisit * visits },
      { label: "Fuel / drive", amount: c.fuelPerVisit * visits },
      { label: "Overhead per pool", amount: c.overheadPerPoolMonth },
      { label: `Processing ${c.processingFeePct}%`, amount: processingFee },
    ],
    grossProfit,
    marginPct: pct(grossProfit, monthlyPrice),
    perVisitProfit: grossProfit / visits,
    annualProfit: grossProfit * 12,
  };
}

/* ── Service (one-off job) margin ───────────────────────────────────── */
export type ServiceLine = { id: string; name: string; cost: number; qty: number; marginPct: number };

export type ServiceMargin = {
  partsCost: number;
  partsSell: number;
  laborCost: number;
  laborSell: number;
  feeCost: number;
  feeSell: number;
  totalCost: number;
  subtotal: number;
  tax: number;
  customerTotal: number;
  profit: number;
  marginPct: number;
};

export function serviceMargin(
  lines: ServiceLine[],
  hours: number,
  c: CostModel,
  opts: { includeTrip: boolean; taxLabor: boolean },
): ServiceMargin {
  const partsCost = lines.reduce((a, l) => a + l.cost * Math.max(1, l.qty), 0);
  const partsSell = lines.reduce((a, l) => {
    const m = Math.min(l.marginPct, 95);
    const unit = m < 100 ? l.cost / (1 - m / 100) : l.cost;
    return a + unit * Math.max(1, l.qty);
  }, 0);
  const laborCost = hours * c.serviceLaborCostHr;
  const laborSell = hours * c.serviceBillRateHr;
  const feeCost = opts.includeTrip ? c.serviceTripCost : 0;
  const feeSell = opts.includeTrip ? c.serviceTripFee : 0;

  const totalCost = partsCost + laborCost + feeCost;
  const subtotal = partsSell + laborSell + feeSell;
  const taxBase = opts.taxLabor ? subtotal : partsSell;
  const tax = taxBase * (c.taxRatePct / 100);
  const profit = subtotal - totalCost;

  return {
    partsCost,
    partsSell,
    laborCost,
    laborSell,
    feeCost,
    feeSell,
    totalCost,
    subtotal,
    tax,
    customerTotal: subtotal + tax,
    profit,
    marginPct: pct(profit, subtotal),
  };
}

/* ── Recurrence & billing schedule ──────────────────────────────────── */
export type Frequency = "weekly" | "biweekly" | "twice_weekly" | "monthly";
export type EndMode = "after" | "on";
export type EndUnit = "visits" | "weeks" | "months";
export type BillingType = "visit_based" | "fixed_price";
export type InvoiceFrequency = "per_visit" | "monthly_last" | "monthly_first" | "on_completion";

export const FREQUENCIES: { id: Frequency; label: string; perMonth: number; days: number }[] = [
  { id: "twice_weekly", label: "Twice weekly", perMonth: 8.66, days: 3.5 },
  { id: "weekly", label: "Weekly", perMonth: 4.33, days: 7 },
  { id: "biweekly", label: "Every 2 weeks", perMonth: 2.17, days: 14 },
  { id: "monthly", label: "Monthly", perMonth: 1, days: 30 },
];

export const findFrequency = (id: Frequency) =>
  FREQUENCIES.find((f) => f.id === id) ?? FREQUENCIES[1];

export type Recurrence = {
  startDate: string;
  frequency: Frequency;
  endMode: EndMode;
  endAfter: number;
  endUnit: EndUnit;
  endOn: string;
  anytime: boolean;
  startTime: string;
  endTime: string;
  instructions: string;
};

export const DEFAULT_RECURRENCE = (): Recurrence => ({
  startDate: new Date().toISOString().slice(0, 10),
  frequency: "weekly",
  endMode: "after",
  endAfter: 12,
  endUnit: "months",
  endOn: new Date(Date.now() + 365 * 864e5).toISOString().slice(0, 10),
  anytime: true,
  startTime: "",
  endTime: "",
  instructions:
    "Test and balance water chemistry, skim surface, brush walls, vacuum floor, and empty baskets.",
});

const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 864e5);

export type Schedule = {
  visits: string[];
  count: number;
  first: string | null;
  last: string | null;
  invoices: number;
  perMonth: number;
};

export function buildSchedule(r: Recurrence, invoiceFreq: InvoiceFrequency): Schedule {
  const freq = findFrequency(r.frequency);
  const start = new Date(`${r.startDate}T12:00:00`);
  if (Number.isNaN(start.getTime())) {
    return { visits: [], count: 0, first: null, last: null, invoices: 0, perMonth: freq.perMonth };
  }

  let end: Date;
  let maxCount = 400;
  if (r.endMode === "on") {
    end = new Date(`${r.endOn}T12:00:00`);
  } else if (r.endUnit === "visits") {
    maxCount = Math.max(1, Math.round(r.endAfter));
    end = addDays(start, 365 * 5);
  } else {
    const days = r.endUnit === "weeks" ? r.endAfter * 7 : r.endAfter * 30.44;
    end = addDays(start, Math.max(1, days));
  }
  if (Number.isNaN(end.getTime())) end = addDays(start, 365);

  const visits: string[] = [];
  let cursor = start;
  while (cursor <= end && visits.length < Math.min(maxCount, 400)) {
    visits.push(cursor.toISOString().slice(0, 10));
    cursor = addDays(cursor, freq.days);
  }

  const months = Math.max(
    1,
    Math.round(
      (new Date(`${visits[visits.length - 1] ?? r.startDate}T12:00:00`).getTime() - start.getTime()) /
        (30.44 * 864e5),
    ) + (r.frequency === "monthly" ? 0 : 1),
  );

  const invoices =
    invoiceFreq === "per_visit"
      ? visits.length
      : invoiceFreq === "on_completion"
        ? 1
        : months;

  return {
    visits,
    count: visits.length,
    first: visits[0] ?? null,
    last: visits[visits.length - 1] ?? null,
    invoices,
    perMonth: freq.perMonth,
  };
}

export const fmtDate = (iso: string | null) =>
  iso
    ? new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "2-digit",
        year: "numeric",
      })
    : "—";
