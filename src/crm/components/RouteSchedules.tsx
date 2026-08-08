import { useMemo, useState } from "react";
import { CalendarClock, Plus, Repeat, Trash2, Zap } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Chip, EmptyState } from "@/crm/components/Brand";
import { useTable } from "@/crm/lib/useSavvy";
import { useWaterBodies } from "@/crm/lib/serviceConfig";

export type RouteSchedule = {
  id: string;
  customer_id: string;
  water_body_id: string | null;
  tech_id: string | null;
  label: string;
  frequency: "weekly" | "biweekly" | "every_n_weeks" | "monthly";
  interval_weeks: number;
  weekdays: number[];
  month_day: number | null;
  start_date: string;
  end_date: string | null;
  stop_order: number;
  minutes_at_stop: number | null;
  notes: string | null;
  is_active: boolean;
  last_generated_through: string | null;
};

const DAYS = [
  { i: 0, short: "Sun" },
  { i: 1, short: "Mon" },
  { i: 2, short: "Tue" },
  { i: 3, short: "Wed" },
  { i: 4, short: "Thu" },
  { i: 5, short: "Fri" },
  { i: 6, short: "Sat" },
];

const FREQ_LABEL: Record<RouteSchedule["frequency"], string> = {
  weekly: "Every week",
  biweekly: "Every 2 weeks",
  every_n_weeks: "Every N weeks",
  monthly: "Monthly (day of month)",
};

const today = () => new Date().toISOString().slice(0, 10);
const plusDays = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

/** Preview the next dates a schedule fires, mirroring ss_generate_route_visits. */
function previewDates(s: RouteSchedule, count = 6) {
  const out: string[] = [];
  const start = new Date(`${s.start_date}T12:00:00`);
  const anchorMs = start.getTime() - ((start.getDay() + 6) % 7) * 86400000; // Monday of start week
  let cursor = new Date(Math.max(start.getTime(), new Date(`${today()}T12:00:00`).getTime()));
  const stop = s.end_date ? new Date(`${s.end_date}T12:00:00`) : null;

  for (let guard = 0; guard < 400 && out.length < count; guard += 1) {
    if (stop && cursor > stop) break;
    if (s.frequency === "monthly") {
      const want = s.month_day ?? start.getDate();
      if (cursor.getDate() === want) out.push(cursor.toISOString().slice(0, 10));
    } else {
      const weekStart = cursor.getTime() - ((cursor.getDay() + 6) % 7) * 86400000;
      const weeks = Math.round((weekStart - anchorMs) / (7 * 86400000));
      if (weeks >= 0 && weeks % Math.max(1, s.interval_weeks) === 0 && s.weekdays.includes(cursor.getDay())) {
        out.push(cursor.toISOString().slice(0, 10));
      }
    }
    cursor = new Date(cursor.getTime() + 86400000);
  }
  return out;
}

/**
 * Per-customer route schedule builder: recurrence, end dates and as many
 * visits per week as the property needs. Generating turns the rules into
 * real visits on the route board.
 */
export default function RouteSchedules({ customerId, canEdit }: { customerId: string; canEdit: boolean }) {
  const [busy, setBusy] = useState(false);
  const [through, setThrough] = useState(plusDays(60));

  const { rows, refetch } = useTable<RouteSchedule>(`route-schedules-${customerId}`, async () => {
    const { data } = await supabase
      .from("ss_route_schedules")
      .select("*")
      .eq("customer_id", customerId)
      .order("stop_order", { ascending: true });
    return (data ?? []) as unknown as RouteSchedule[];
  });

  const { rows: techs } = useTable<{ id: string; full_name: string }>("route-schedule-techs", async () => {
    const { data } = await supabase.from("ss_staff").select("id,full_name").order("full_name");
    return (data ?? []) as { id: string; full_name: string }[];
  });

  const { rows: bodies } = useWaterBodies(customerId);

  const visitsPerMonth = useMemo(
    () =>
      rows
        .filter((r) => r.is_active)
        .reduce((sum, r) => {
          if (r.frequency === "monthly") return sum + 1;
          return sum + (r.weekdays.length * 4.33) / Math.max(1, r.interval_weeks);
        }, 0),
    [rows],
  );

  async function patch(id: string, p: Partial<RouteSchedule>) {
    const { error } = await supabase.from("ss_route_schedules").update(p as never).eq("id", id);
    if (error) toast.error(error.message);
    else refetch();
  }

  async function addSchedule() {
    setBusy(true);
    const { error } = await supabase.from("ss_route_schedules").insert({
      customer_id: customerId,
      label: "Service route",
      frequency: "weekly",
      weekdays: [2],
      start_date: today(),
      stop_order: rows.length,
    } as never);
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Schedule added");
      refetch();
    }
  }

  async function removeSchedule(id: string) {
    const { error } = await supabase.from("ss_route_schedules").delete().eq("id", id);
    if (error) toast.error(error.message);
    else refetch();
  }

  async function generate() {
    setBusy(true);
    const { data, error } = await supabase.rpc("ss_generate_route_visits", {
      p_customer_id: customerId,
      p_through: through,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      const made = Number(data ?? 0);
      toast.success(made ? `${made} visit${made === 1 ? "" : "s"} added to the route` : "No new visits — already scheduled");
      refetch();
    }
  }

  return (
    <div className="space-y-3">
      <div className="ss-card flex flex-wrap items-end justify-between gap-3 p-3.5">
        <div>
          <div className="ss-label">Route schedule</div>
          <p className="mt-1 max-w-lg text-[0.78rem] opacity-75">
            Build the recurring stops for this property. Pick the days of the week, how often the pattern repeats and when it
            should stop. Generating writes the real visits onto the route board.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone="aqua">{rows.filter((r) => r.is_active).length} active pattern(s)</Chip>
            <Chip tone="green">≈ {visitsPerMonth.toFixed(1)} visits / month</Chip>
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-wrap items-end gap-2">
            <label className="text-[0.7rem] opacity-75">
              <span className="ss-tag block">Build through</span>
              <input type="date" className="ss-input !w-auto" value={through} onChange={(e) => setThrough(e.target.value)} />
            </label>
            <button className="ss-btn" disabled={busy || !rows.length} onClick={generate}>
              <Zap size={13} /> Generate visits
            </button>
            <button className="ss-btn ss-btn-ghost" disabled={busy} onClick={addSchedule}>
              <Plus size={13} /> Add pattern
            </button>
          </div>
        )}
      </div>

      {!rows.length && <EmptyState>No recurring schedule yet — add a pattern to put this property on a route.</EmptyState>}

      {rows.map((s) => {
        const upcoming = previewDates(s);
        return (
          <div key={s.id} className="ss-card space-y-3 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <input
                className="ss-input max-w-[240px] flex-1 font-semibold"
                value={s.label}
                disabled={!canEdit}
                onChange={(e) => patch(s.id, { label: e.target.value })}
              />
              <div className="flex items-center gap-2">
                <Chip tone={s.is_active ? "green" : "orange"}>{s.is_active ? "Active" : "Paused"}</Chip>
                {canEdit && (
                  <>
                    <button className="ss-btn ss-btn-ghost" onClick={() => patch(s.id, { is_active: !s.is_active })}>
                      <Repeat size={13} /> {s.is_active ? "Pause" : "Resume"}
                    </button>
                    <button className="ss-btn ss-btn-ghost" onClick={() => removeSchedule(s.id)} aria-label="Delete schedule">
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <label className="text-[0.7rem] opacity-80">
                <span className="ss-tag block">Repeats</span>
                <select
                  className="ss-input"
                  value={s.frequency}
                  disabled={!canEdit}
                  onChange={(e) => patch(s.id, { frequency: e.target.value as RouteSchedule["frequency"] })}
                >
                  {Object.entries(FREQ_LABEL).map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              {s.frequency === "every_n_weeks" && (
                <label className="text-[0.7rem] opacity-80">
                  <span className="ss-tag block">Every N weeks</span>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    className="ss-input"
                    value={s.interval_weeks}
                    disabled={!canEdit}
                    onChange={(e) => patch(s.id, { interval_weeks: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </label>
              )}

              {s.frequency === "monthly" && (
                <label className="text-[0.7rem] opacity-80">
                  <span className="ss-tag block">Day of month</span>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    className="ss-input"
                    value={s.month_day ?? Number(s.start_date.slice(8, 10))}
                    disabled={!canEdit}
                    onChange={(e) => patch(s.id, { month_day: Math.min(28, Math.max(1, Number(e.target.value) || 1)) })}
                  />
                </label>
              )}

              <label className="text-[0.7rem] opacity-80">
                <span className="ss-tag block">Starts</span>
                <input
                  type="date"
                  className="ss-input"
                  value={s.start_date}
                  disabled={!canEdit}
                  onChange={(e) => patch(s.id, { start_date: e.target.value })}
                />
              </label>

              <label className="text-[0.7rem] opacity-80">
                <span className="ss-tag block">Ends (optional)</span>
                <input
                  type="date"
                  className="ss-input"
                  value={s.end_date ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => patch(s.id, { end_date: e.target.value || null })}
                />
              </label>

              <label className="text-[0.7rem] opacity-80">
                <span className="ss-tag block">Technician</span>
                <select
                  className="ss-input"
                  value={s.tech_id ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => patch(s.id, { tech_id: e.target.value || null })}
                >
                  <option value="">Unassigned</option>
                  {techs.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-[0.7rem] opacity-80">
                <span className="ss-tag block">Body of water</span>
                <select
                  className="ss-input"
                  value={s.water_body_id ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => patch(s.id, { water_body_id: e.target.value || null })}
                >
                  <option value="">Whole property</option>
                  {bodies.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-[0.7rem] opacity-80">
                <span className="ss-tag block">Stop order</span>
                <input
                  type="number"
                  className="ss-input"
                  value={s.stop_order}
                  disabled={!canEdit}
                  onChange={(e) => patch(s.id, { stop_order: Number(e.target.value) || 0 })}
                />
              </label>

              <label className="text-[0.7rem] opacity-80">
                <span className="ss-tag block">Minutes at stop</span>
                <input
                  type="number"
                  className="ss-input"
                  value={s.minutes_at_stop ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => patch(s.id, { minutes_at_stop: e.target.value ? Number(e.target.value) : null })}
                />
              </label>
            </div>

            {s.frequency !== "monthly" && (
              <div>
                <span className="ss-tag">Days of the week — pick more than one for multiple visits per week</span>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {DAYS.map((d) => {
                    const on = s.weekdays.includes(d.i);
                    return (
                      <button
                        key={d.i}
                        type="button"
                        disabled={!canEdit}
                        className={`ss-btn ${on ? "" : "ss-btn-ghost"} !px-2.5 !py-1 text-[0.72rem]`}
                        onClick={() => {
                          const next = on ? s.weekdays.filter((x) => x !== d.i) : [...s.weekdays, d.i].sort((a, b) => a - b);
                          if (!next.length) {
                            toast.error("Pick at least one day");
                            return;
                          }
                          patch(s.id, { weekdays: next });
                        }}
                      >
                        {d.short}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <label className="block text-[0.7rem] opacity-80">
              <span className="ss-tag block">Route notes</span>
              <input
                className="ss-input"
                value={s.notes ?? ""}
                disabled={!canEdit}
                placeholder="Gate on the north side, dog inside on Tuesdays…"
                onChange={(e) => patch(s.id, { notes: e.target.value })}
              />
            </label>

            <div className="text-[0.74rem] opacity-80">
              <span className="ss-tag inline-flex items-center gap-1">
                <CalendarClock size={11} /> Next stops
              </span>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {upcoming.length ? (
                  upcoming.map((d) => (
                    <Chip key={d} tone="aqua">
                      {new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </Chip>
                  ))
                ) : (
                  <span className="opacity-70">No upcoming dates — check the start and end dates.</span>
                )}
              </div>
              {s.last_generated_through && (
                <div className="mt-1 opacity-65">Visits built through {s.last_generated_through}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
