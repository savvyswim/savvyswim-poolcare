/**
 * Lab water chemistry quick reference — Savvy Swim.
 * "Know the ranges. Know the fixes. Never guess."
 *
 * Extra reference data that sits alongside the dosing engine in chem.ts:
 * parameters the tech eyeballs (phosphates, TDS), the algae playbook and
 * the shock dosing table.
 */

export type RefParam = {
  key: string;
  label: string;
  range: string;
  low: string;
  high: string;
  notes: string;
};

export const REFERENCE_PARAMS: RefParam[] = [
  {
    key: "fc",
    label: "Free Chlorine (ppm)",
    range: "1.0 – 3.0",
    low: "Add chlorine (liquid, tablet, or granular)",
    high: "Stop adding chlorine; allow to dissipate naturally",
    notes: "Test at every visit. Most important parameter.",
  },
  {
    key: "ph",
    label: "pH",
    range: "7.4 – 7.6",
    low: "Add pH Increaser (Sodium Carbonate)",
    high: "Add pH Decreaser (Muriatic Acid or Dry Acid)",
    notes: "Affects everything — chlorine effectiveness, comfort, equipment.",
  },
  {
    key: "ta",
    label: "Total Alkalinity (ppm)",
    range: "80 – 120",
    low: "Add Alkalinity Increaser (Sodium Bicarbonate)",
    high: "Add Muriatic Acid in small doses over time",
    notes: "Stabilizes pH. Fix TA before adjusting pH.",
  },
  {
    key: "cyc",
    label: "CYA / Stabilizer (ppm)",
    range: "30 – 50",
    low: "Add Cyanuric Acid (granular)",
    high: "Partial drain & refill — no chemical fix",
    notes: "Protects chlorine from UV. Too high = chlorine lock.",
  },
  {
    key: "salt",
    label: "Salt (ppm) — SWG pools",
    range: "2700 – 3400",
    low: "Add Pool Salt (NaCl)",
    high: "Partial drain & refill",
    notes: "Only for salt water generator pools.",
  },
  {
    key: "ch",
    label: "Calcium Hardness (ppm)",
    range: "200 – 400",
    low: "Add Calcium Chloride",
    high: "Partial drain & refill; use sequestrant",
    notes: "Low = etching. High = scaling. Check monthly.",
  },
  {
    key: "phos",
    label: "Phosphates (ppb)",
    range: "< 200",
    low: "N/A — low is good",
    high: "Add Phosphate Remover (e.g., PHOSfree)",
    notes: "Algae food. High phosphates = algae risk.",
  },
  {
    key: "tds",
    label: "Total Dissolved Solids (ppm)",
    range: "< 1500 (chlorine) / < 6000 (salt)",
    low: "N/A — low is good",
    high: "Partial drain & refill",
    notes: "High TDS = water feels 'tired'. Check quarterly.",
  },
];

export const ALGAE_GUIDE = [
  {
    type: "Green Algae",
    appearance: "Green tint or patches",
    cause: "Low chlorine or high phosphates",
    treatment: "Shock + algaecide + brush + vacuum",
    prevention: "Maintain 1–3 ppm chlorine; reduce phosphates",
  },
  {
    type: "Yellow / Mustard Algae",
    appearance: "Yellow-brown dust on walls",
    cause: "Chlorine-resistant strain",
    treatment: "High-dose shock + yellow algaecide + brush all surfaces",
    prevention: "Clean all equipment that touched pool",
  },
  {
    type: "Black Algae",
    appearance: "Black spots on plaster",
    cause: "Penetrates into pool surface",
    treatment: "Brush aggressively + triple shock + algaecide; may need acid wash",
    prevention: "Maintain chemistry; brush weekly",
  },
];

export const SHOCK_TABLE = [
  { gallons: 5000, label: "5,000 gal", regular: "1 lb", super: "2 lbs", liquid: "0.5 gal", notes: "" },
  { gallons: 10000, label: "10,000 gal", regular: "1 lb", super: "2 lbs", liquid: "1 gal", notes: "Most residential pools" },
  { gallons: 15000, label: "15,000 gal", regular: "1.5 lbs", super: "3 lbs", liquid: "1.5 gal", notes: "" },
  { gallons: 20000, label: "20,000 gal", regular: "2 lbs", super: "4 lbs", liquid: "2 gal", notes: "" },
  { gallons: 25000, label: "25,000 gal", regular: "2.5 lbs", super: "5 lbs", liquid: "2.5 gal", notes: "" },
  { gallons: 30000, label: "30,000+ gal", regular: "3+ lbs", super: "6+ lbs", liquid: "3+ gal", notes: "Scale proportionally" },
];

/** Closest shock row for a pool size. */
export function shockFor(gallons: number | null | undefined) {
  if (!gallons || gallons <= 0) return null;
  return (
    SHOCK_TABLE.find((r) => gallons <= r.gallons) ?? SHOCK_TABLE[SHOCK_TABLE.length - 1]
  );
}

/** Phosphates / TDS are pass-fail checks, not dosed by the engine. */
export function phosphateAdvice(ppb: number | undefined) {
  if (ppb === undefined || Number.isNaN(ppb)) return null;
  if (ppb < 200) return { status: "good" as const, text: `Phosphates ${ppb} ppb — under 200 ppb, no action.` };
  return {
    status: "high" as const,
    text: `Phosphates ${ppb} ppb — add phosphate remover (PHOSfree) and re-test next visit. Algae food.`,
  };
}

export function tdsAdvice(ppm: number | undefined, saltPool: boolean) {
  if (ppm === undefined || Number.isNaN(ppm)) return null;
  const limit = saltPool ? 6000 : 1500;
  if (ppm < limit) return { status: "good" as const, text: `TDS ${ppm} ppm — under ${limit} ppm limit.` };
  return {
    status: "high" as const,
    text: `TDS ${ppm} ppm is over the ${limit} ppm limit — schedule a partial drain & refill.`,
  };
}
