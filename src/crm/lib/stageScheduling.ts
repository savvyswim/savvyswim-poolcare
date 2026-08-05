import { supabase } from "@/integrations/supabase/client";

export const DAY = 86400000;

export type SchedStage = {
  id: string;
  name: string;
  sort_order: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
  depends_on_id: string | null;
  lag_days: number;
};

export function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
export function parseDate(d: string | null) {
  return d ? new Date(`${d}T00:00:00`) : null;
}

function durationOf(s: SchedStage) {
  const sd = parseDate(s.start_date);
  const ed = parseDate(s.end_date);
  if (sd && ed) return Math.max(1, Math.round((ed.getTime() - sd.getTime()) / DAY) + 1);
  return Math.max(1, s.duration_days || 7);
}

/**
 * Recomputes dates for every stage that (directly or indirectly) depends on another stage.
 * A dependent starts the day after its predecessor ends, plus its lag, and keeps its own length.
 * Returns only the stages whose dates actually changed.
 */
export function cascadeSchedule<T extends SchedStage>(stages: T[]): T[] {
  const byId = new Map(stages.map((s) => [s.id, { ...s }]));
  const ordered = [...stages].sort((a, b) => a.sort_order - b.sort_order);
  // Repeat passes so chains of any depth settle (bounded to avoid cycles looping forever).
  for (let pass = 0; pass < stages.length + 1; pass++) {
    let moved = false;
    for (const s of ordered) {
      const cur = byId.get(s.id)!;
      if (!cur.depends_on_id || cur.depends_on_id === cur.id) continue;
      const pred = byId.get(cur.depends_on_id);
      const predEnd = parseDate(pred?.end_date ?? null);
      if (!pred || !predEnd) continue;
      const days = durationOf(cur);
      const start = new Date(predEnd.getTime() + (1 + Math.max(0, cur.lag_days || 0)) * DAY);
      const end = new Date(start.getTime() + (days - 1) * DAY);
      const startISO = toISO(start);
      const endISO = toISO(end);
      if (cur.start_date !== startISO || cur.end_date !== endISO) {
        byId.set(cur.id, { ...cur, start_date: startISO, end_date: endISO, duration_days: days });
        moved = true;
      }
    }
    if (!moved) break;
  }
  const changed: T[] = [];
  for (const s of stages) {
    const next = byId.get(s.id)!;
    if (next.start_date !== s.start_date || next.end_date !== s.end_date) changed.push(next as T);
  }
  return changed;
}

export async function persistStageDates(rows: { id: string; start_date: string | null; end_date: string | null }[]) {
  for (const r of rows) {
    // eslint-disable-next-line no-await-in-loop
    const { error } = await supabase
      .from("ss_project_stages")
      .update({ start_date: r.start_date, end_date: r.end_date })
      .eq("id", r.id);
    if (error) return error.message;
  }
  return null;
}
