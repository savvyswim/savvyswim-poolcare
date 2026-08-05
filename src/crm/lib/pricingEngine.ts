import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CityRate = {
  id: string;
  city: string;
  low: number;
  high: number;
  market_avg: number;
  market_note: string | null;
  is_active: boolean;
  sort_order: number;
};

export type Addon = {
  id: string;
  key: string;
  label: string;
  kind: string; // 'flat' | 'percent'
  amount: number;
  description: string | null;
  is_active: boolean;
  sort_order: number;
};

export type Margins = {
  chem_cost_basis: number;
  margin_multiplier: number;
  /** How far below the regional market average we quote, in percent (10–20). */
  undercut_pct: number;
  wizard_done: boolean;
};

export type PromoCode = {
  id: string;
  code: string;
  description: string | null;
  discount_type: string; // percent | amount | free_months
  value: number;
  applies_to: string; // recurring | first_month | jobs
  min_commitment_months: number;
  max_redemptions: number | null;
  times_used: number;
  expires_at: string | null;
  is_active: boolean;
};

export const DEFAULT_MARGINS: Margins = {
  chem_cost_basis: 38,
  margin_multiplier: 3,
  undercut_pct: 15,
  wizard_done: false,
};

export const money = (n: number | null | undefined) =>
  `$${Number(n ?? 0).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

export const money2 = (n: number | null | undefined) =>
  `$${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const POOL_SIZES = [
  { id: "small", label: "Small · under 12k gal", gallons: 10000, factor: 0.88 },
  { id: "avg", label: "Average · 12–20k gal", gallons: 16000, factor: 1 },
  { id: "large", label: "Large · 20–30k gal", gallons: 25000, factor: 1.14 },
  { id: "xl", label: "Oversized · 30k+ gal", gallons: 35000, factor: 1.3 },
] as const;

export const UNDERCUT_MIN = 10;
export const UNDERCUT_MAX = 20;

export const clampUndercut = (n: number) =>
  Math.min(UNDERCUT_MAX, Math.max(UNDERCUT_MIN, Math.round(Number(n) || UNDERCUT_MIN)));

/** Regional market average for a city, falling back to the band midpoint plus a market premium. */
export function marketAverage(band: { low: number; high: number; market_avg?: number } | undefined) {
  if (!band) return 0;
  const stored = Number(band.market_avg ?? 0);
  if (stored > 0) return Math.round(stored);
  return Math.round(((Number(band.low) + Number(band.high)) / 2) * 1.12);
}

/** What we should quote to land a set percentage under the regional average. */
export function undercutTarget(marketAvg: number, pct: number, floor = 0) {
  const raw = marketAvg * (1 - clampUndercut(pct) / 100);
  return Math.max(Math.round(raw / 5) * 5, floor);
}

export const CONDITIONS = [
  { id: "clean", label: "Clean", cleanupLow: 0, cleanupHigh: 0 },
  { id: "neglected", label: "Neglected", cleanupLow: 150, cleanupHigh: 250 },
  { id: "green", label: "Green", cleanupLow: 450, cleanupHigh: 650 },
] as const;

export async function fetchRateCard() {
  const [cities, addons, settings] = await Promise.all([
    supabase.from("ss_city_rates").select("*").order("sort_order"),
    supabase.from("ss_addons").select("*").order("sort_order"),
    supabase.from("ss_settings").select("value").eq("key", "pricing_margins").maybeSingle(),
  ]);
  return {
    cities: ((cities.data ?? []) as CityRate[]).map((c) => ({
      ...c,
      low: Number(c.low),
      high: Number(c.high),
      market_avg: Number(c.market_avg ?? 0),
    })),
    addons: ((addons.data ?? []) as Addon[]).map((a) => ({ ...a, amount: Number(a.amount) })),
    margins: { ...DEFAULT_MARGINS, ...((settings.data?.value as Partial<Margins>) ?? {}) },
  };
}

export function useRateCard() {
  const [cities, setCities] = useState<CityRate[]>([]);
  const [addons, setAddons] = useState<Addon[]>([]);
  const [margins, setMargins] = useState<Margins>(DEFAULT_MARGINS);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const data = await fetchRateCard();
    setCities(data.cities);
    setAddons(data.addons);
    setMargins(data.margins);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { cities, addons, margins, loading, refresh, setCities, setAddons, setMargins };
}

export async function saveMargins(next: Partial<Margins>) {
  const current = await supabase
    .from("ss_settings")
    .select("value")
    .eq("key", "pricing_margins")
    .maybeSingle();
  const value = { ...DEFAULT_MARGINS, ...((current.data?.value as object) ?? {}), ...next };
  const { error } = await supabase
    .from("ss_settings")
    .upsert({ key: "pricing_margins", value }, { onConflict: "key" });
  return error?.message ?? null;
}

/** Monthly rate below which a job does not clear the chemical margin floor. */
export function marginFloor(m: Margins) {
  return Math.round((m.chem_cost_basis || 0) * (m.margin_multiplier || 0));
}

export function addonAmount(addons: Addon[], key: string, fallback = 0) {
  const a = addons.find((x) => x.key === key && x.is_active);
  return a ? Number(a.amount) : fallback;
}

export type QuoteInput = {
  city: string;
  poolSize: string;
  condition: string;
  spa: "none" | "medium" | "large";
  chemOnly: boolean;
  chemIncluded?: boolean;
  saltCell?: boolean;
  rateOverride?: number | null;
};

export type QuoteLine = { label: string; amount: number; note?: string };

export function computeQuote(
  input: QuoteInput,
  cities: CityRate[],
  addons: Addon[],
) {
  const band = cities.find((c) => c.city === input.city) ?? cities[0];
  const low = band ? Number(band.low) : 0;
  const high = band ? Number(band.high) : 0;
  const mid = Math.round((low + high) / 2);
  const base =
    input.rateOverride != null && input.rateOverride > 0
      ? Number(input.rateOverride)
      : input.poolSize === "small"
        ? low
        : input.poolSize === "large"
          ? high
          : mid;

  const lines: QuoteLine[] = [];
  let monthly = base;
  const chemFactor = addonAmount(addons, "chem_only_factor", 62) / 100;

  if (input.chemOnly) {
    monthly = Math.round(base * chemFactor);
    lines.push({ label: `${input.city} chem-only base`, amount: monthly });
  } else {
    lines.push({ label: `${input.city} weekly service base`, amount: base });
  }

  if (input.spa === "medium") {
    const a = addonAmount(addons, "spa_medium", 25);
    monthly += a;
    lines.push({ label: "Medium spa", amount: a });
  }
  if (input.spa === "large") {
    const a = addonAmount(addons, "spa_large", 40);
    monthly += a;
    lines.push({ label: "Large spa", amount: a });
  }
  if (input.chemIncluded) {
    const a = addonAmount(addons, "chem_included", 35);
    monthly += a;
    lines.push({ label: "Chemicals included", amount: a });
  }
  if (input.saltCell) {
    const a = addonAmount(addons, "salt_cell", 20);
    monthly += a;
    lines.push({ label: "Saltwater system", amount: a });
  }

  const cond = CONDITIONS.find((c) => c.id === input.condition) ?? CONDITIONS[0];
  const cleanup = cond.cleanupHigh ? Math.round((cond.cleanupLow + cond.cleanupHigh) / 2) : 0;

  return {
    base,
    monthly,
    lines,
    cleanup,
    cleanupLabel: cond.cleanupHigh ? `$${cond.cleanupLow}–${cond.cleanupHigh}` : null,
    band: { low, mid, high },
  };
}

export type PromoResult = {
  valid: boolean;
  message: string;
  code?: string;
  label?: string;
  discount: number;
  freeMonths: number;
  monthlyAfter: number;
  commitmentMonths: number;
  promo?: PromoCode;
};

export function applyPromo(
  monthly: number,
  promo: PromoCode | null | undefined,
  commitmentMonths: number,
): PromoResult {
  const none: PromoResult = {
    valid: false,
    message: "",
    discount: 0,
    freeMonths: 0,
    monthlyAfter: monthly,
    commitmentMonths,
  };
  if (!promo) return none;
  if (!promo.is_active) return { ...none, message: "That code is no longer active" };
  if (promo.expires_at && new Date(promo.expires_at) < new Date())
    return { ...none, message: "That code has expired" };
  if (promo.max_redemptions != null && promo.times_used >= promo.max_redemptions)
    return { ...none, message: "That code has been fully redeemed" };
  if (commitmentMonths < promo.min_commitment_months)
    return {
      ...none,
      message: `Requires a ${promo.min_commitment_months}-month commitment`,
    };

  let discount = 0;
  let freeMonths = 0;
  let label = `${promo.code}`;
  if (promo.min_commitment_months)
    label += ` · ${promo.min_commitment_months}-month commitment`;

  if (promo.discount_type === "percent") {
    discount = Math.round((monthly * promo.value) / 100);
    label += ` · −${promo.value}%`;
  } else if (promo.discount_type === "amount") {
    discount = Math.min(promo.value, monthly);
    label += ` · −${money(discount)}`;
  } else {
    freeMonths = promo.value;
    label += ` · ${promo.value} month${promo.value === 1 ? "" : "s"} free`;
  }

  return {
    valid: true,
    message: "Code applied",
    code: promo.code,
    label,
    discount,
    freeMonths,
    monthlyAfter: Math.max(monthly - discount, 0),
    commitmentMonths: Math.max(commitmentMonths, promo.min_commitment_months),
    promo,
  };
}

export async function lookupPromo(code: string): Promise<PromoCode | null> {
  const clean = code.trim().toUpperCase();
  if (!clean) return null;
  const { data } = await supabase
    .from("ss_promo_codes")
    .select("*")
    .eq("code", clean)
    .maybeSingle();
  return data ? ({ ...data, value: Number(data.value) } as PromoCode) : null;
}

/** Owner-facing suggestion: blends the city band midpoint with real won-deal value. */
export function recommendRate(
  band: { low: number; high: number },
  wonAvg: number | null,
  floor: number,
) {
  const mid = (Number(band.low) + Number(band.high)) / 2;
  const blended = wonAvg && wonAvg > 0 ? mid * 0.6 + wonAvg * 0.4 : mid;
  const suggested = Math.max(Math.round(blended / 5) * 5, floor);
  return {
    suggested,
    wonAvg,
    thin: Number(band.low) < floor,
    floor,
  };
}
