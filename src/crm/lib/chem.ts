// Live pool chemistry dosing — Savvy Swim standard formulas.
export type Readings = {
  fc?: number; ph?: number; ta?: number; ch?: number;
  cyc?: number; psi?: number; temp?: number; salt?: number;
  phos?: number; tds?: number; borate?: number; copper?: number;
  iron?: number; orp?: number; peroxide?: number;
};

export const CHEM_COST = { chlorinePerOz: 0.05, acidPerOz: 0.045 };

/** Savvy Swim water chemistry targets. */
export const TARGETS = {
  fc: { min: 1, max: 3, ideal: 2, label: "Chlorine", unit: "ppm", purpose: "Sanitation" },
  ph: { min: 7.4, max: 7.6, ideal: 7.5, label: "pH", unit: "", purpose: "Comfort & equipment" },
  ta: { min: 80, max: 120, ideal: 100, label: "Alkalinity", unit: "ppm", purpose: "Stability" },
  ch: { min: 200, max: 400, ideal: 250, label: "Hardness", unit: "ppm", purpose: "Surface protection" },
  cyc: { min: 30, max: 50, ideal: 40, label: "CYA", unit: "ppm", purpose: "Chlorine shield" },
  psi: { min: 8, max: 15, ideal: 12, label: "Filter PSI", unit: "psi", purpose: "Circulation" },
  salt: { min: 3000, max: 3400, ideal: 3200, label: "Salt", unit: "ppm", purpose: "Cell output" },
  phos: { min: 0, max: 125, ideal: 0, label: "Phosphates", unit: "ppb", purpose: "Algae fuel" },
  tds: { min: 0, max: 1500, ideal: 1000, label: "TDS", unit: "ppm", purpose: "Water age" },
  borate: { min: 30, max: 50, ideal: 40, label: "Borates", unit: "ppm", purpose: "pH buffer" },
  copper: { min: 0, max: 0.2, ideal: 0, label: "Copper", unit: "ppm", purpose: "Staining metal" },
  iron: { min: 0, max: 0.2, ideal: 0, label: "Iron", unit: "ppm", purpose: "Staining metal" },
  orp: { min: 650, max: 750, ideal: 700, label: "ORP", unit: "mV", purpose: "Sanitizer strength" },
  peroxide: { min: 50, max: 100, ideal: 75, label: "Peroxide", unit: "ppm", purpose: "Biguanide sanitizer" },
} as const;

export type MetricKey = keyof typeof TARGETS;

/** Liquid chlorine 12.5% — only dosed when free chlorine is below 1 ppm; raises to 2 ppm. */
export function chlorineOz(fc: number | undefined, gallons: number) {
  if (fc === undefined || Number.isNaN(fc)) return 0;
  if (fc >= TARGETS.fc.min) return 0;
  const oz = (TARGETS.fc.ideal - fc) * (gallons / 10000) * 10.7;
  return oz > 0 ? Math.round(oz * 10) / 10 : 0;
}

/** Muriatic acid: oz = (pH - 7.5)/0.1 x 5 x gallons/10000, only when pH > 7.6 */
export function acidOz(ph: number | undefined, gallons: number) {
  if (ph === undefined || Number.isNaN(ph) || ph <= TARGETS.ph.max) return 0;
  const oz = ((ph - TARGETS.ph.ideal) / 0.1) * 5 * (gallons / 10000);
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
  { key: "fc", label: "Free Cl", unit: "ppm", target: "1–3", step: 0.1 },
  { key: "ph", label: "pH", unit: "", target: "7.4–7.6", step: 0.1 },
  { key: "ta", label: "Alkalinity", unit: "ppm", target: "80–120", step: 1 },
  { key: "ch", label: "Hardness", unit: "ppm", target: "200–400", step: 1 },
  { key: "cyc", label: "CYA", unit: "ppm", target: "30–50", step: 1 },
  { key: "psi", label: "Filter PSI", unit: "psi", target: "8–15", step: 1 },
  { key: "temp", label: "Water Temp", unit: "°F", target: "—", step: 1 },
  { key: "salt", label: "Salt", unit: "ppm", target: "3000–3400", step: 10 },
  { key: "phos", label: "Phosphates", unit: "ppb", target: "< 125", step: 5 },
  { key: "tds", label: "TDS", unit: "ppm", target: "< 1500", step: 50 },
  { key: "borate", label: "Borates", unit: "ppm", target: "30–50", step: 1 },
  { key: "copper", label: "Copper", unit: "ppm", target: "< 0.2", step: 0.1 },
  { key: "iron", label: "Iron", unit: "ppm", target: "< 0.2", step: 0.1 },
  { key: "orp", label: "ORP", unit: "mV", target: "650–750", step: 10 },
  { key: "peroxide", label: "Peroxide", unit: "ppm", target: "50–100", step: 5 },
] as const;

/* ────────────────────────────────────────────────────────────────
   Report engine — anything inside range is good; anything outside
   gets an exact chemical + amount so the tech never has to think.
   ──────────────────────────────────────────────────────────────── */

export type Status = "good" | "low" | "high" | "unknown";

export type MetricResult = {
  key: MetricKey;
  label: string;
  unit: string;
  purpose: string;
  value: number | null;
  range: string;
  status: Status;
};

export type Treatment = {
  metric: MetricKey;
  chemical: string;
  amount: string;
  reason: string;
};

const round1 = (n: number) => Math.round(n * 10) / 10;
const lbs = (n: number) => (n < 1 ? `${round1(n * 16)} oz` : `${round1(n)} lb`);
const per10k = (g: number) => g / 10000;

export function statusFor(key: MetricKey, value: number | undefined): Status {
  if (value === undefined || Number.isNaN(value)) return "unknown";
  const t = TARGETS[key];
  if (value < t.min) return "low";
  if (value > t.max) return "high";
  return "good";
}

export function evaluate(readings: Readings, gallons: number) {
  const metrics: MetricResult[] = (Object.keys(TARGETS) as MetricKey[]).map((key) => {
    const t = TARGETS[key];
    const value = (readings as Record<string, number | undefined>)[key];
    return {
      key,
      label: t.label,
      unit: t.unit,
      purpose: t.purpose,
      value: value === undefined || Number.isNaN(value) ? null : value,
      range: `${t.min}–${t.max}${t.unit ? ` ${t.unit}` : ""}`,
      status: statusFor(key, value),
    };
  });

  const g = per10k(gallons || 0);
  const treatments: Treatment[] = [];
  const { fc, ph, ta, ch, cyc, psi, salt } = readings;

  if (statusFor("fc", fc) === "low") {
    treatments.push({
      metric: "fc",
      chemical: "Liquid chlorine 12.5%",
      amount: `${chlorineOz(fc, gallons)} oz`,
      reason: `Free chlorine ${fc} ppm is below the 1–3 ppm sanitation range.`,
    });
  } else if (statusFor("fc", fc) === "high") {
    treatments.push({
      metric: "fc",
      chemical: "No chlorine added",
      amount: "Hold 24–48 hrs",
      reason: `Free chlorine ${fc} ppm is above 3 ppm — let it burn off before swimming.`,
    });
  }

  if (statusFor("ph", ph) === "high") {
    treatments.push({
      metric: "ph",
      chemical: "Muriatic acid 31.45%",
      amount: `${acidOz(ph, gallons)} oz`,
      reason: `pH ${ph} is above 7.6 — scaling and cloudy water risk.`,
    });
  } else if (statusFor("ph", ph) === "low" && ph !== undefined) {
    treatments.push({
      metric: "ph",
      chemical: "Soda ash (sodium carbonate)",
      amount: lbs(((TARGETS.ph.ideal - ph) / 0.1) * 0.4 * g),
      reason: `pH ${ph} is below 7.4 — corrosive to plaster and equipment.`,
    });
  }

  if (statusFor("ta", ta) === "low" && ta !== undefined) {
    treatments.push({
      metric: "ta",
      chemical: "Sodium bicarbonate (alkalinity up)",
      amount: lbs(((TARGETS.ta.ideal - ta) / 10) * 1.5 * g),
      reason: `Alkalinity ${ta} ppm is below 80 ppm — pH will bounce.`,
    });
  } else if (statusFor("ta", ta) === "high" && ta !== undefined) {
    treatments.push({
      metric: "ta",
      chemical: "Muriatic acid 31.45% (slug dose)",
      amount: lbs(((ta - TARGETS.ta.ideal) / 10) * 0.16 * g),
      reason: `Alkalinity ${ta} ppm is above 120 ppm — lower slowly over the next visits.`,
    });
  }

  if (statusFor("ch", ch) === "low" && ch !== undefined) {
    treatments.push({
      metric: "ch",
      chemical: "Calcium chloride (hardness up)",
      amount: lbs(((TARGETS.ch.ideal - ch) / 10) * 1.25 * g),
      reason: `Calcium hardness ${ch} ppm is low — water will pull calcium from the surface.`,
    });
  } else if (statusFor("ch", ch) === "high" && ch !== undefined) {
    treatments.push({
      metric: "ch",
      chemical: "Partial drain & refill",
      amount: "Dilute ~25%",
      reason: `Calcium hardness ${ch} ppm is high — scaling risk on tile and cell.`,
    });
  }

  if (statusFor("cyc", cyc) === "low" && cyc !== undefined) {
    treatments.push({
      metric: "cyc",
      chemical: "Cyanuric acid (stabilizer)",
      amount: lbs(((TARGETS.cyc.ideal - cyc) / 10) * 0.83 * g),
      reason: `CYA ${cyc} ppm is low — sunlight burns off chlorine fast.`,
    });
  } else if (statusFor("cyc", cyc) === "high" && cyc !== undefined) {
    treatments.push({
      metric: "cyc",
      chemical: "Partial drain & refill",
      amount: "Dilute to 30–50 ppm",
      reason: `CYA ${cyc} ppm is above 50 ppm — chlorine gets locked up.`,
    });
  }

  if (statusFor("salt", salt) === "low" && salt !== undefined) {
    treatments.push({
      metric: "salt",
      chemical: "Pool salt",
      amount: lbs(((TARGETS.salt.ideal - salt) * (gallons || 0) * 8.34) / 1_000_000),
      reason: `Salt ${salt} ppm is below 3000 ppm — cell output drops.`,
    });
  } else if (statusFor("salt", salt) === "high" && salt !== undefined) {
    treatments.push({
      metric: "salt",
      chemical: "Partial drain & refill",
      amount: "Dilute to 3000–3400 ppm",
      reason: `Salt ${salt} ppm is above range — corrosion risk.`,
    });
  }

  const { phos, tds, borate, copper, iron, orp, peroxide } = readings;

  if (statusFor("phos", phos) === "high" && phos !== undefined) {
    treatments.push({
      metric: "phos",
      chemical: "Phosphate remover (lanthanum)",
      amount: `${round1(Math.max(4, (phos / 1000) * 9) * g)} oz`,
      reason: `Phosphates ${phos} ppb are above 125 ppb — algae food, chlorine demand climbs.`,
    });
  }

  if (statusFor("tds", tds) === "high" && tds !== undefined) {
    treatments.push({
      metric: "tds",
      chemical: "Partial drain & refill",
      amount: `Dilute ~${Math.min(50, Math.round(((tds - TARGETS.tds.ideal) / Math.max(tds, 1)) * 100))}%`,
      reason: `TDS ${tds} ppm is above 1500 ppm — dull water and weak sanitizer (salt pools read higher by design).`,
    });
  }

  if (statusFor("borate", borate) === "low" && borate !== undefined) {
    treatments.push({
      metric: "borate",
      chemical: "Sodium tetraborate (borate up)",
      amount: lbs(((TARGETS.borate.ideal - borate) / 10) * 1.4 * g),
      reason: `Borates ${borate} ppm are below 30 ppm — pH drifts up between visits.`,
    });
  } else if (statusFor("borate", borate) === "high" && borate !== undefined) {
    treatments.push({
      metric: "borate",
      chemical: "Partial drain & refill",
      amount: "Dilute to 30–50 ppm",
      reason: `Borates ${borate} ppm are above 50 ppm — only dilution lowers borates.`,
    });
  }

  if (statusFor("copper", copper) === "high" && copper !== undefined) {
    treatments.push({
      metric: "copper",
      chemical: "Metal sequestrant + partial drain",
      amount: `${round1(32 * g)} oz sequestrant`,
      reason: `Copper ${copper} ppm is above 0.2 ppm — blue-green staining and hair discoloration risk.`,
    });
  }

  if (statusFor("iron", iron) === "high" && iron !== undefined) {
    treatments.push({
      metric: "iron",
      chemical: "Metal sequestrant + filter with clarifier",
      amount: `${round1(32 * g)} oz sequestrant`,
      reason: `Iron ${iron} ppm is above 0.2 ppm — rust staining on plaster and fittings.`,
    });
  }

  if (statusFor("orp", orp) === "low" && orp !== undefined) {
    treatments.push({
      metric: "orp",
      chemical: "Raise sanitizer / verify CYA",
      amount: "On site",
      reason: `ORP ${orp} mV is below 650 mV — sanitizer is not killing fast enough.`,
    });
  } else if (statusFor("orp", orp) === "high" && orp !== undefined) {
    treatments.push({
      metric: "orp",
      chemical: "Reduce feed rate",
      amount: "On site",
      reason: `ORP ${orp} mV is above 750 mV — over-sanitized, hard on surfaces and swimmers.`,
    });
  }

  if (statusFor("peroxide", peroxide) === "low" && peroxide !== undefined) {
    treatments.push({
      metric: "peroxide",
      chemical: "Biguanide shock (hydrogen peroxide)",
      amount: `${round1(((TARGETS.peroxide.ideal - peroxide) / 10) * 6 * g)} oz`,
      reason: `Peroxide ${peroxide} ppm is below 50 ppm — biguanide pool loses sanitation.`,
    });
  } else if (statusFor("peroxide", peroxide) === "high" && peroxide !== undefined) {
    treatments.push({
      metric: "peroxide",
      chemical: "Hold shock, retest",
      amount: "Wait 24–48 hrs",
      reason: `Peroxide ${peroxide} ppm is above 100 ppm — let it burn down before adding more.`,
    });
  }

  if (statusFor("psi", psi) === "high" && psi !== undefined) {
    treatments.push({
      metric: "psi",
      chemical: "Backwash / clean filter",
      amount: "On site",
      reason: `Filter pressure ${psi} psi is high — flow restricted.`,
    });
  } else if (statusFor("psi", psi) === "low" && psi !== undefined) {
    treatments.push({
      metric: "psi",
      chemical: "Check water level & pump basket",
      amount: "On site",
      reason: `Filter pressure ${psi} psi is low — possible suction-side air or low water.`,
    });
  }

  const tested = metrics.filter((m) => m.status !== "unknown");
  const outOfRange = tested.filter((m) => m.status !== "good");
  const allGood = tested.length > 0 && outOfRange.length === 0;

  return {
    metrics,
    treatments,
    tested,
    outOfRange,
    allGood,
    lsi: lsi(readings),
    summary: allGood
      ? "All tested levels are within Savvy Swim targets — water is balanced and swim-ready."
      : outOfRange.length
        ? `${outOfRange.length} level${outOfRange.length > 1 ? "s" : ""} outside target — corrected on site.`
        : "No readings recorded on this visit.",
  };
}

/* ────────────────────────────────────────────────────────────────
   Severity bands — how far outside the Savvy Swim target a reading
   is. Drives the colour of the field and whether the office gets
   an alert when the tech saves the visit.
   ──────────────────────────────────────────────────────────────── */

export type Severity = "unknown" | "good" | "watch" | "critical";

/** Outside these bands the water is unsafe / equipment is at risk. */
export const CRITICAL_BANDS: Record<MetricKey, { low: number | null; high: number | null }> = {
  fc: { low: 0.5, high: 5 },
  ph: { low: 7.0, high: 8.0 },
  ta: { low: 60, high: 180 },
  ch: { low: 150, high: 600 },
  cyc: { low: 20, high: 100 },
  psi: { low: 5, high: 22 },
  salt: { low: 2500, high: 4500 },
  phos: { low: null, high: 500 },
  tds: { low: null, high: 3000 },
  borate: { low: 10, high: 80 },
  copper: { low: null, high: 0.5 },
  iron: { low: null, high: 0.5 },
  orp: { low: 550, high: 850 },
  peroxide: { low: 30, high: 150 },
};

export function severityFor(key: MetricKey, value: number | undefined): Severity {
  const status = statusFor(key, value);
  if (status === "unknown" || status === "good") return status;
  const band = CRITICAL_BANDS[key];
  const v = value as number;
  if (status === "low" && band.low != null && v < band.low) return "critical";
  if (status === "high" && band.high != null && v > band.high) return "critical";
  return "watch";
}

/** Inline colours (brand tokens) for a reading input / chip. */
export function severityTone(sev: Severity) {
  switch (sev) {
    case "critical":
      return { bg: "hsl(var(--ss-burgundy) / .1)", fg: "hsl(var(--ss-burgundy))", border: "hsl(var(--ss-burgundy))" };
    case "watch":
      return { bg: "hsl(38 92% 92%)", fg: "hsl(28 80% 30%)", border: "hsl(38 85% 45%)" };
    case "good":
      return { bg: "hsl(152 55% 92%)", fg: "hsl(152 60% 24%)", border: "hsl(152 45% 40%)" };
    default:
      return { bg: "transparent", fg: "inherit", border: "hsl(var(--ss-ink) / .2)" };
  }
}

export type ReadingFlag = {
  key: MetricKey;
  label: string;
  value: number;
  unit: string;
  range: string;
  status: Status;
  severity: Severity;
};

/** Every tested reading that sits outside target, worst first. */
export function flagReadings(readings: Readings): ReadingFlag[] {
  const order: Record<Severity, number> = { critical: 0, watch: 1, good: 2, unknown: 3 };
  return (Object.keys(TARGETS) as MetricKey[])
    .map((key) => {
      const t = TARGETS[key];
      const value = (readings as Record<string, number | undefined>)[key];
      const severity = severityFor(key, value);
      return {
        key,
        label: t.label,
        value: value as number,
        unit: t.unit,
        range: `${t.min}–${t.max}${t.unit ? ` ${t.unit}` : ""}`,
        status: statusFor(key, value),
        severity,
      };
    })
    .filter((f) => f.severity === "watch" || f.severity === "critical")
    .sort((a, b) => order[a.severity] - order[b.severity]);
}

export function describeFlags(flags: ReadingFlag[]) {
  return flags
    .map((f) => `${f.label} ${f.value}${f.unit ? ` ${f.unit}` : ""} (${f.status}, target ${f.range})`)
    .join(" · ");
}
