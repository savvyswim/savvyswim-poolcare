/**
 * Pay Per Pool compensation engine.
 *
 * Techs are paid a flat rate for every pool they complete, plus optional
 * volume bonuses and a commission on upsells they sell at the pool. The same
 * numbers roll into the finance side so the office can see what the company
 * keeps after tech pay, chemicals, bonuses and commission.
 */

export type PayConfig = {
  /** Default pay to the tech for one completed pool. */
  default_rate: number;
  /** Contractor default (usually higher — they cover their own truck/fuel). */
  contractor_rate: number;
  /** Pools per day required before the daily bonus kicks in. */
  bonus_threshold: number;
  /** Flat bonus paid once the daily threshold is met. */
  bonus_amount: number;
  /** Percent of an upsell sale paid to the tech who sold it. */
  upsell_pct: number;
  /** Estimated chemical cost per visit when a visit has no logged chem cost. */
  default_chem_cost: number;
};

export const DEFAULT_PAY_CONFIG: PayConfig = {
  default_rate: 18,
  contractor_rate: 24,
  bonus_threshold: 10,
  bonus_amount: 25,
  upsell_pct: 10,
  default_chem_cost: 6,
};

export const PAY_SETTINGS_KEY = "pay_per_pool";

export type PayVisit = {
  id: string;
  scheduled_date: string;
  tech_id: string | null;
  status: string;
  completed_at: string | null;
  chem_cost: number | null;
  tech_pay: number | null;
  tech_bonus: number | null;
  upsell_amount: number | null;
  upsell_commission: number | null;
  pay_status: string | null;
  payout_id: string | null;
  ss_customers: {
    id: string;
    full_name: string;
    city: string | null;
    monthly_price: number | null;
    route_frequency: string | null;
    tech_pay_rate: number | null;
    tech_upsell_pct: number | null;
  } | null;
};

export type PayLine = {
  visitId: string;
  date: string;
  techId: string | null;
  customerId: string | null;
  customerName: string;
  city: string | null;
  /** Revenue attributed to this single visit. */
  revenue: number;
  basePay: number;
  bonus: number;
  upsellAmount: number;
  commission: number;
  chemCost: number;
  techTotal: number;
  /** What the company keeps after tech pay, chems, bonus and commission. */
  companyKeeps: number;
  locked: boolean;
  payStatus: string;
};

/** Visits per month implied by a route frequency. */
export function visitsPerMonth(freq: string | null | undefined): number {
  const f = (freq ?? "weekly").toLowerCase();
  if (f.includes("twice") || f.includes("2x")) return 8.66;
  if (f.includes("bi") || f.includes("every other")) return 2.17;
  if (f.includes("month")) return 1;
  return 4.33;
}

/** What the office knows about a tech: level plus their personal defaults. */
export type TechMeta = {
  level?: string | null;
  pay_rate?: number | null;
  upsell_pct?: number | null;
};

/**
 * Pay for one pool, most specific wins:
 * frozen visit pay → this pool's own rate → the tech's personal rate →
 * contractor/company default.
 */
export function rateFor(
  visit: PayVisit,
  cfg: PayConfig,
  tech?: TechMeta | string | null,
): number {
  const meta: TechMeta = typeof tech === "string" ? { level: tech } : (tech ?? {});
  if (visit.tech_pay && visit.tech_pay > 0) return Number(visit.tech_pay);
  const custom = visit.ss_customers?.tech_pay_rate;
  if (custom != null && Number(custom) > 0) return Number(custom);
  if (meta.pay_rate != null && Number(meta.pay_rate) > 0) return Number(meta.pay_rate);
  return meta.level === "contractor" ? cfg.contractor_rate : cfg.default_rate;
}

/** Commission % on an upsell: pool override → tech override → company default. */
export function upsellPctFor(
  visit: PayVisit,
  cfg: PayConfig,
  tech?: TechMeta | string | null,
): number {
  const meta: TechMeta = typeof tech === "string" ? { level: tech } : (tech ?? {});
  const pool = visit.ss_customers?.tech_upsell_pct;
  if (pool != null && Number(pool) > 0) return Number(pool);
  if (meta.upsell_pct != null && Number(meta.upsell_pct) > 0) return Number(meta.upsell_pct);
  return cfg.upsell_pct;
}

export function revenueFor(visit: PayVisit): number {
  const monthly = Number(visit.ss_customers?.monthly_price ?? 0);
  if (!monthly) return 0;
  return monthly / visitsPerMonth(visit.ss_customers?.route_frequency);
}

/**
 * Build pay lines for a set of completed visits. Bonuses are awarded per
 * tech per day once the daily pool threshold is met.
 */
export function buildPayLines(
  visits: PayVisit[],
  cfg: PayConfig,
  techByid: Record<string, TechMeta | string> = {},
): PayLine[] {
  // Count pools per tech per day so the daily bonus lands on the last pool.
  const dayCounts = new Map<string, PayVisit[]>();
  for (const v of visits) {
    const key = `${v.tech_id ?? "none"}|${v.scheduled_date}`;
    const list = dayCounts.get(key) ?? [];
    list.push(v);
    dayCounts.set(key, list);
  }
  const bonusVisit = new Set<string>();
  for (const list of dayCounts.values()) {
    if (cfg.bonus_threshold > 0 && list.length >= cfg.bonus_threshold) {
      const last = [...list].sort((a, b) =>
        (a.completed_at ?? "").localeCompare(b.completed_at ?? ""),
      )[list.length - 1];
      if (last) bonusVisit.add(last.id);
    }
  }

  return visits.map((v) => {
    const meta = techByid[v.tech_id ?? ""];
    const locked = !!v.payout_id;
    const basePay = rateFor(v, cfg, meta);
    const bonus = locked
      ? Number(v.tech_bonus ?? 0)
      : bonusVisit.has(v.id)
        ? cfg.bonus_amount
        : 0;
    const upsellAmount = Number(v.upsell_amount ?? 0);
    const pct = upsellPctFor(v, cfg, meta);
    const commission = locked
      ? Number(v.upsell_commission ?? 0)
      : Math.round(upsellAmount * (pct / 100) * 100) / 100;
    const chemCost = v.chem_cost != null ? Number(v.chem_cost) : cfg.default_chem_cost;
    const revenue = revenueFor(v) + upsellAmount;
    const techTotal = basePay + bonus + commission;
    return {
      visitId: v.id,
      date: v.scheduled_date,
      techId: v.tech_id,
      customerId: v.ss_customers?.id ?? null,
      customerName: v.ss_customers?.full_name ?? "Unassigned pool",
      city: v.ss_customers?.city ?? null,
      revenue,
      basePay,
      bonus,
      upsellAmount,
      commission,
      chemCost,
      techTotal,
      companyKeeps: revenue - techTotal - chemCost,
      locked,
      payStatus: v.pay_status ?? "pending",
    };
  });
}

export type PayTotals = {
  pools: number;
  revenue: number;
  basePay: number;
  bonus: number;
  commission: number;
  chemCost: number;
  techTotal: number;
  companyKeeps: number;
  marginPct: number;
};

export function sumLines(lines: PayLine[]): PayTotals {
  const t = lines.reduce<PayTotals>(
    (acc, l) => ({
      pools: acc.pools + 1,
      revenue: acc.revenue + l.revenue,
      basePay: acc.basePay + l.basePay,
      bonus: acc.bonus + l.bonus,
      commission: acc.commission + l.commission,
      chemCost: acc.chemCost + l.chemCost,
      techTotal: acc.techTotal + l.techTotal,
      companyKeeps: acc.companyKeeps + l.companyKeeps,
      marginPct: 0,
    }),
    {
      pools: 0, revenue: 0, basePay: 0, bonus: 0, commission: 0,
      chemCost: 0, techTotal: 0, companyKeeps: 0, marginPct: 0,
    },
  );
  t.marginPct = t.revenue > 0 ? (t.companyKeeps / t.revenue) * 100 : 0;
  return t;
}

export const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

export function isoDay(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Monday-start week range containing `ref`. */
export function weekRange(ref: Date): { start: string; end: string } {
  const d = new Date(ref);
  const day = (d.getDay() + 6) % 7;
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return { start: isoDay(start), end: isoDay(end) };
}

/** Payout state for a pay period. */
export type PayStatus = "pending" | "approved" | "paid";

export const PAY_STATUS_LABEL: Record<PayStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  paid: "Paid",
};

const PAY_STATUS_RANK: Record<PayStatus, number> = { pending: 0, approved: 1, paid: 2 };

/** Normalize a raw visit/payout status string into a pay status. */
export function normalizePayStatus(raw: string | null | undefined): PayStatus {
  const v = (raw ?? "").toLowerCase();
  if (v === "paid") return "paid";
  if (v === "approved") return "approved";
  return "pending";
}

/** The least-advanced status wins, so a period only reads "paid" when it all is. */
export function rollupPayStatus(values: Array<string | null | undefined>): PayStatus {
  if (!values.length) return "pending";
  return values
    .map(normalizePayStatus)
    .reduce((a, b) => (PAY_STATUS_RANK[b] < PAY_STATUS_RANK[a] ? b : a));
}

/** One pay period of history for a single pool. */
export type PeriodEarnings = {
  start: string;
  end: string;
  visits: number;
  /** Average base pay per visit in that period. */
  rate: number;
  upsellAmount: number;
  upsellPct: number;
  bonus: number;
  commission: number;
  total: number;
  locked: boolean;
  /** Where this period's money stands: awaiting approval, approved, or paid. */
  payStatus: PayStatus;

};

/** Group pay lines into Monday-start pay periods, newest first. */
export function periodHistory(lines: PayLine[]): PeriodEarnings[] {
  const map = new Map<string, PayLine[]>();
  for (const l of lines) {
    const { start } = weekRange(new Date(`${l.date}T12:00:00`));
    map.set(start, [...(map.get(start) ?? []), l]);
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([start, ls]) => {
      const { end } = weekRange(new Date(`${start}T12:00:00`));
      const base = ls.reduce((s, l) => s + l.basePay, 0);
      const upsellAmount = ls.reduce((s, l) => s + l.upsellAmount, 0);
      const commission = ls.reduce((s, l) => s + l.commission, 0);
      return {
        start,
        end,
        visits: ls.length,
        rate: ls.length ? base / ls.length : 0,
        upsellAmount,
        upsellPct: upsellAmount > 0 ? (commission / upsellAmount) * 100 : 0,
        bonus: ls.reduce((s, l) => s + l.bonus, 0),
        commission,
        total: ls.reduce((s, l) => s + l.techTotal, 0),
        locked: ls.some((l) => l.locked),
        payStatus: rollupPayStatus(ls.map((l) => l.payStatus)),
      };
    });
}
