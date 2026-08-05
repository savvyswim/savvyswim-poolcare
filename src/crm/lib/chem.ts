// Live pool chemistry dosing — Savvy Swim standard formulas.
export type Readings = {
  fc?: number; ph?: number; ta?: number; ch?: number;
  cyc?: number; psi?: number; temp?: number; salt?: number;
};

export const CHEM_COST = { chlorinePerOz: 0.05, acidPerOz: 0.045 };

/** Liquid chlorine 12.5%: oz = (3 - FC) x gallons/10000 x 10.7 */
export function chlorineOz(fc: number | undefined, gallons: number) {
  if (fc === undefined || Number.isNaN(fc)) return 0;
  const oz = (3 - fc) * (gallons / 10000) * 10.7;
  return oz > 0 ? Math.round(oz * 10) / 10 : 0;
}

/** Muriatic acid: oz = (pH - 7.5)/0.1 x 5 x gallons/10000, only when pH > 7.6 */
export function acidOz(ph: number | undefined, gallons: number) {
  if (ph === undefined || Number.isNaN(ph) || ph <= 7.6) return 0;
  const oz = ((ph - 7.5) / 0.1) * 5 * (gallons / 10000);
  return Math.round(oz * 10) / 10;
}

const tempFactor = (f: number) => {
  if (f <= 32) return 0.0;
  if (f <= 46) return 0.1;
  if (f <= 53) return 0.2;
  if (f <= 60) return 0.3;
  if (f <= 66) return 0.4;
  if (f <= 76) return 0.5;
  if (f <= 84) return 0.6;
  if (f <= 94) return 0.7;
  return 0.8;
};

/** LSI = pH + TF + (log10(CH) - 0.4) + log10(TA) - 12.1 */
export function lsi(r: Readings) {
  const { ph, ch, ta, temp } = r;
  if (!ph || !ch || !ta || !temp) return null;
  const value = ph + tempFactor(temp) + (Math.log10(ch) - 0.4) + Math.log10(ta) - 12.1;
  return Math.round(value * 100) / 100;
}

export function lsiVerdict(value: number | null) {
  if (value === null) return { label: "—", tone: "neutral" as const };
  if (value < -0.3) return { label: "Corrosive", tone: "bad" as const };
  if (value > 0.3) return { label: "Scaling", tone: "bad" as const };
  return { label: "Balanced", tone: "good" as const };
}

export function chemCost(clOz: number, acOz: number) {
  return Math.round((clOz * CHEM_COST.chlorinePerOz + acOz * CHEM_COST.acidPerOz) * 100) / 100;
}

export function doseFor(readings: Readings, gallons: number) {
  const cl = chlorineOz(readings.fc, gallons);
  const ac = acidOz(readings.ph, gallons);
  return { chlorine_oz: cl, acid_oz: ac, cost: chemCost(cl, ac), lsi: lsi(readings) };
}

export const READING_FIELDS = [
  { key: "fc", label: "Free Cl", unit: "ppm", target: "2–4", step: 0.1 },
  { key: "ph", label: "pH", unit: "", target: "7.4–7.6", step: 0.1 },
  { key: "ta", label: "Alkalinity", unit: "ppm", target: "80–120", step: 1 },
  { key: "ch", label: "Hardness", unit: "ppm", target: "200–400", step: 1 },
  { key: "cyc", label: "CYA", unit: "ppm", target: "30–50", step: 1 },
  { key: "psi", label: "Filter PSI", unit: "psi", target: "10–15", step: 1 },
  { key: "temp", label: "Water Temp", unit: "°F", target: "—", step: 1 },
  { key: "salt", label: "Salt", unit: "ppm", target: "3000–3400", step: 10 },
] as const;
