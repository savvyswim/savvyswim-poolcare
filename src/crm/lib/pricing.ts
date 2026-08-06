// Savvy Swim pricing engine — per-city monthly ranges for full weekly service.
export type CityPrice = { low: number; mid: number; high: number };

export const CITY_PRICING: Record<string, CityPrice> = {
  "Highland Park": { low: 250, mid: 285, high: 320 },
  "University Park": { low: 240, mid: 270, high: 300 },
  Dallas: { low: 220, mid: 250, high: 280 },
  Prosper: { low: 200, mid: 225, high: 250 },
  Frisco: { low: 190, mid: 215, high: 240 },
  Plano: { low: 190, mid: 215, high: 240 },
  Celina: { low: 190, mid: 215, high: 240 },
  McKinney: { low: 180, mid: 205, high: 230 },
  Allen: { low: 180, mid: 200, high: 220 },
  Rockwall: { low: 180, mid: 200, high: 220 },
  Rowlett: { low: 165, mid: 182, high: 200 },
  Sachse: { low: 165, mid: 180, high: 195 },
  Garland: { low: 160, mid: 175, high: 190 },
  Forney: { low: 160, mid: 175, high: 190 },
  Mesquite: { low: 150, mid: 165, high: 180 },
};

export const CITIES = Object.keys(CITY_PRICING);

export const POOL_SIZES = [
  { id: "small", label: "Small", key: "low" as const },
  { id: "avg", label: "Average", key: "mid" as const },
  { id: "large", label: "Large", key: "high" as const },
];

export const SPA_OPTIONS = [
  { id: "none", label: "No spa", addon: 0 },
  { id: "medium", label: "Medium spa", addon: 25 },
  { id: "large", label: "Large spa", addon: 40 },
];

export const CONDITIONS = [
  { id: "clean", label: "Clean", cleanupLow: 0, cleanupHigh: 0 },
  { id: "neglected", label: "Neglected", cleanupLow: 150, cleanupHigh: 250 },
  { id: "green", label: "Green", cleanupLow: 450, cleanupHigh: 650 },
];

export const CHEM_ONLY_FACTOR = 0.62;

export type QuoteInput = {
  city: string;
  poolSize: string;
  condition: string;
  spa: string;
  serviceType: "full" | "chem_only";
};

export function computeQuote(input: QuoteInput) {
  const band = CITY_PRICING[input.city] ?? CITY_PRICING["Dallas"]!;
  const sizeKey = POOL_SIZES.find((s) => s.id === input.poolSize)?.key ?? "mid";
  let base = band[sizeKey];
  if (input.serviceType === "chem_only") base = Math.round(base * CHEM_ONLY_FACTOR);
  const spa = SPA_OPTIONS.find((s) => s.id === input.spa) ?? SPA_OPTIONS[0]!;
  const cond = CONDITIONS.find((c) => c.id === input.condition) ?? CONDITIONS[0]!;
  const cleanup = cond.cleanupHigh
    ? Math.round((cond.cleanupLow + cond.cleanupHigh) / 2)
    : 0;
  return {
    base,
    spaAddon: spa.addon,
    monthly: base + spa.addon,
    cleanup,
    cleanupLabel: cond.cleanupHigh
      ? `$${cond.cleanupLow}–${cond.cleanupHigh}`
      : null,
    conditionId: cond.id,
  };
}

export const money = (n: number | null | undefined) =>
  `$${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export const money2 = (n: number | null | undefined) =>
  `$${Number(n ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
