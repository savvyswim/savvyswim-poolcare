/**
 * Pool-size time standards.
 *
 * Managers set a target window of minutes a tech should spend at each pool
 * based on gallons. Visits that come in under the window are flagged yellow
 * so an owner or office manager can review them, and every tech gets a
 * scorecard built from the same rule.
 */

export type TimeStandard = {
  id: string;
  size_key: string;
  label: string;
  min_gallons: number;
  max_gallons: number | null;
  target_min_minutes: number;
  target_max_minutes: number;
  max_drive_minutes: number;
  notes: string | null;
  sort_order: number;
  is_commercial: boolean;
};

export type TimeVerdict = "short" | "on_target" | "long" | "unknown";

/** Fallback used before the standards table loads. */
export const DEFAULT_STANDARDS: Omit<TimeStandard, "id">[] = [
  { size_key: "small", label: "Small (< 10k gal)", min_gallons: 0, max_gallons: 9999, target_min_minutes: 15, target_max_minutes: 20, max_drive_minutes: 8, notes: "Efficient route = more pools/day", sort_order: 1, is_commercial: false },
  { size_key: "medium", label: "Medium (10–20k gal)", min_gallons: 10000, max_gallons: 20000, target_min_minutes: 20, target_max_minutes: 30, max_drive_minutes: 8, notes: "PSL standard pool size", sort_order: 2, is_commercial: false },
  { size_key: "large", label: "Large (20–35k gal)", min_gallons: 20001, max_gallons: 35000, target_min_minutes: 30, target_max_minutes: 40, max_drive_minutes: 8, notes: "May require 2x/week", sort_order: 3, is_commercial: false },
  { size_key: "xl", label: "Extra Large (35k+ gal)", min_gallons: 35001, max_gallons: null, target_min_minutes: 40, target_max_minutes: 60, max_drive_minutes: 8, notes: "Price accordingly", sort_order: 4, is_commercial: false },
  { size_key: "commercial", label: "Commercial", min_gallons: 0, max_gallons: null, target_min_minutes: 60, target_max_minutes: 90, max_drive_minutes: 0, notes: "Separate route recommended", sort_order: 5, is_commercial: true },
];

/** Pick the standard that matches a pool's gallons (and pool type). */
export function standardFor(
  standards: TimeStandard[],
  gallons: number | null | undefined,
  poolType?: string | null,
): TimeStandard | null {
  if (!standards.length) return null;
  const commercial = standards.find((s) => s.is_commercial);
  if (commercial && (poolType ?? "").toLowerCase().includes("commercial")) return commercial;
  if (gallons == null) return null;
  const residential = standards
    .filter((s) => !s.is_commercial)
    .sort((a, b) => a.min_gallons - b.min_gallons);
  return (
    residential.find(
      (s) => gallons >= s.min_gallons && (s.max_gallons == null || gallons <= s.max_gallons),
    ) ?? null
  );
}

/** Minutes a tech actually spent on site. */
export function minutesOnSite(visit: {
  minutes_on_site?: number | null;
  arrived_at?: string | null;
  completed_at?: string | null;
}): number | null {
  if (typeof visit.minutes_on_site === "number" && visit.minutes_on_site > 0) {
    return visit.minutes_on_site;
  }
  if (visit.arrived_at && visit.completed_at) {
    const ms = new Date(visit.completed_at).getTime() - new Date(visit.arrived_at).getTime();
    if (ms > 0) return Math.round(ms / 60000);
  }
  return null;
}

/** Short of target = yellow attention flag for manager and admin. */
export function verdictFor(minutes: number | null, std: TimeStandard | null): TimeVerdict {
  if (minutes == null || !std) return "unknown";
  if (minutes < std.target_min_minutes) return "short";
  if (minutes > std.target_max_minutes) return "long";
  return "on_target";
}

export const VERDICT_LABEL: Record<TimeVerdict, string> = {
  short: "Under target",
  on_target: "On target",
  long: "Over target",
  unknown: "No timing",
};

export const VERDICT_TONE: Record<TimeVerdict, "gold" | "green" | "aqua" | "ink"> = {
  short: "gold",
  on_target: "green",
  long: "aqua",
  unknown: "ink",
};

export type ScoredVisit = {
  id: string;
  scheduled_date: string;
  customer_name: string;
  city: string | null;
  gallons: number | null;
  tech_id: string | null;
  tech_name: string;
  minutes: number | null;
  standard: TimeStandard | null;
  verdict: TimeVerdict;
  /** How far under the low end of the window, in minutes. */
  shortBy: number;
};

export type TechScore = {
  tech_id: string;
  tech_name: string;
  visits: number;
  timed: number;
  short: number;
  onTarget: number;
  long: number;
  avgMinutes: number | null;
  /** 0-100 — share of timed visits that met or beat the target window. */
  score: number;
};

export function scoreByTech(visits: ScoredVisit[]): TechScore[] {
  const map = new Map<string, TechScore & { _sum: number }>();
  for (const v of visits) {
    const key = v.tech_id ?? "unassigned";
    const row =
      map.get(key) ??
      { tech_id: key, tech_name: v.tech_name, visits: 0, timed: 0, short: 0, onTarget: 0, long: 0, avgMinutes: null, score: 0, _sum: 0 };
    row.visits += 1;
    if (v.minutes != null) {
      row.timed += 1;
      row._sum += v.minutes;
    }
    if (v.verdict === "short") row.short += 1;
    if (v.verdict === "on_target") row.onTarget += 1;
    if (v.verdict === "long") row.long += 1;
    map.set(key, row);
  }
  return [...map.values()]
    .map(({ _sum, ...r }) => ({
      ...r,
      avgMinutes: r.timed ? Math.round(_sum / r.timed) : null,
      score: r.timed ? Math.round(((r.onTarget + r.long) / r.timed) * 100) : 0,
    }))
    .sort((a, b) => b.score - a.score || b.visits - a.visits);
}
