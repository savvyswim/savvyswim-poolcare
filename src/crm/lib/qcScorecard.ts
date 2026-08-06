export type QcCategory =
  | "Chemistry"
  | "Service Quality"
  | "Equipment"
  | "Documentation"
  | "Professionalism"
  | "Efficiency"
  | "Customer"
  | "Safety";

export type QcCriterion = { n: number; label: string; category: QcCategory };

/** Weekly service manager QC scorecard — rate each item 1–5. */
export const QC_CRITERIA: QcCriterion[] = [
  { n: 1, label: "Water chemistry balanced within target ranges", category: "Chemistry" },
  { n: 2, label: "Chemicals dosed correctly and recorded in the app", category: "Chemistry" },
  { n: 3, label: "Brushing completed — walls, waterline, steps, tiles", category: "Service Quality" },
  { n: 4, label: "Skimming completed — pool surface clear", category: "Service Quality" },
  { n: 5, label: "All baskets emptied — skimmer, pump, leaf", category: "Service Quality" },
  { n: 6, label: "Vacuuming completed where needed", category: "Service Quality" },
  { n: 7, label: "Equipment inspected — issues flagged", category: "Equipment" },
  { n: 8, label: "System returned to Auto mode", category: "Equipment" },
  { n: 9, label: "Service report completed accurately", category: "Documentation" },
  { n: 10, label: "Photos uploaded — before & after", category: "Documentation" },
  { n: 11, label: "Gate locked on departure", category: "Professionalism" },
  { n: 12, label: "Truck clean and organized", category: "Professionalism" },
  { n: 13, label: "On-time arrival — within route schedule", category: "Efficiency" },
  { n: 14, label: "Time per pool within standard", category: "Efficiency" },
  { n: 15, label: "Professional communication if customer present", category: "Professionalism" },
  { n: 16, label: "No customer complaints this week", category: "Customer" },
  { n: 17, label: "Uniform / appearance meets standard", category: "Professionalism" },
  { n: 18, label: "Safety protocols followed", category: "Safety" },
  { n: 19, label: "No equipment damage caused", category: "Safety" },
  { n: 20, label: "Checklist completed for every stop", category: "Documentation" },
];

/** Anything scored under 3 is a fail that must be addressed this week. */
export const PASS_THRESHOLD = 3;

export type QcScores = Record<string, number>;
export type QcNotes = Record<string, string>;

export function qcAverage(scores: QcScores): number | null {
  const vals = Object.values(scores).filter((v) => Number.isFinite(v) && v > 0);
  if (!vals.length) return null;
  return Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 100) / 100;
}

export function qcFailedItems(scores: QcScores): QcCriterion[] {
  return QC_CRITERIA.filter((c) => {
    const v = scores[String(c.n)];
    return Number.isFinite(v) && v > 0 && v < PASS_THRESHOLD;
  });
}

export function qcCategoryAverages(scores: QcScores) {
  const map = new Map<QcCategory, number[]>();
  for (const c of QC_CRITERIA) {
    const v = scores[String(c.n)];
    if (!Number.isFinite(v) || !v) continue;
    map.set(c.category, [...(map.get(c.category) ?? []), v]);
  }
  return [...map.entries()].map(([category, vals]) => ({
    category,
    avg: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
    count: vals.length,
  }));
}

/** Monday of the week containing `d`, as YYYY-MM-DD. */
export function weekStart(d: Date = new Date()): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x.toISOString().slice(0, 10);
}

export function weekRange(monday: string) {
  const start = new Date(`${monday}T12:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return { start: monday, end: end.toISOString().slice(0, 10) };
}

export function scoreTone(avg: number | null) {
  if (avg == null) return "ink" as const;
  if (avg >= 4.5) return "green" as const;
  if (avg >= 3.5) return "aqua" as const;
  if (avg >= 3) return "gold" as const;
  return "orange" as const;
}
