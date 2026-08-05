import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarRange, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";


export type TimelineStage = {
  id: string;
  name: string;
  sort_order: number;
  status: string;
  start_date: string | null;
  end_date: string | null;
  duration_days: number;
};

const DAY = 86400000;

function toISO(d: Date) {
  return d.toISOString().slice(0, 10);
}
function parse(d: string | null) {
  return d ? new Date(`${d}T00:00:00`) : null;
}
function fmt(d: string | null) {
  const p = parse(d);
  return p ? p.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "—";
}

export function ProjectTimeline({
  stages,
  projectStart,
  targetDate,
  onChange,
}: {
  stages: TimelineStage[];
  projectStart: string | null;
  targetDate: string | null;
  onChange: (next: TimelineStage[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [drag, setDrag] = useState<{ id: string; offsetDays: number } | null>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    pxPerDay: number;
    baseStart: number;
    baseEnd: number;
    offsetDays: number;
  } | null>(null);

  const scheduled = stages.filter((s) => s.start_date && s.end_date);


  const bounds = useMemo(() => {
    const dates: number[] = [];
    scheduled.forEach((s) => {
      dates.push(parse(s.start_date)!.getTime(), parse(s.end_date)!.getTime());
    });
    if (projectStart) dates.push(parse(projectStart)!.getTime());
    if (targetDate) dates.push(parse(targetDate)!.getTime());
    if (!dates.length) return null;
    const min = Math.min(...dates);
    const max = Math.max(...dates);
    return { min, max, span: Math.max(max - min, DAY) };
  }, [scheduled, projectStart, targetDate]);

  const todayPct = useMemo(() => {
    if (!bounds) return null;
    const t = Date.now();
    if (t < bounds.min || t > bounds.max) return null;
    return ((t - bounds.min) / bounds.span) * 100;
  }, [bounds]);

  async function autoSchedule() {
    const base = projectStart ?? toISO(new Date());
    setBusy(true);
    let cursor = parse(base)!.getTime();
    const next: TimelineStage[] = [];
    for (const s of [...stages].sort((a, b) => a.sort_order - b.sort_order)) {
      const days = Math.max(1, s.duration_days || 7);
      const start = new Date(cursor);
      const end = new Date(cursor + (days - 1) * DAY);
      next.push({ ...s, start_date: toISO(start), end_date: toISO(end) });
      cursor = end.getTime() + DAY;
    }
    for (const s of next) {
      // eslint-disable-next-line no-await-in-loop
      const { error } = await supabase
        .from("ss_project_stages")
        .update({ start_date: s.start_date, end_date: s.end_date })
        .eq("id", s.id);
      if (error) {
        setBusy(false);
        return toast.error(error.message);
      }
    }
    setBusy(false);
    onChange(next);
    toast.success("Timeline built from the project start date");
  }

  async function patch(id: string, field: "start_date" | "end_date" | "duration_days", value: string) {
    const val = field === "duration_days" ? Math.max(1, Number(value) || 1) : value || null;
    onChange(stages.map((s) => (s.id === id ? { ...s, [field]: val } as TimelineStage : s)));
    const payload =
      field === "duration_days"
        ? { duration_days: val as number }
        : field === "start_date"
          ? { start_date: val as string | null }
          : { end_date: val as string | null };
    const { error } = await supabase.from("ss_project_stages").update(payload).eq("id", id);
    if (error) toast.error(error.message);
  }

  const stagesRef = useRef(stages);
  stagesRef.current = stages;

  const shiftStage = useCallback(
    async (id: string, days: number) => {
      const s = stagesRef.current.find((x) => x.id === id);
      if (!s || !s.start_date || !s.end_date || !days) return;
      const start = toISO(new Date(parse(s.start_date)!.getTime() + days * DAY));
      const end = toISO(new Date(parse(s.end_date)!.getTime() + days * DAY));
      onChange(
        stagesRef.current.map((x) => (x.id === id ? { ...x, start_date: start, end_date: end } : x)),
      );
      const { error } = await supabase
        .from("ss_project_stages")
        .update({ start_date: start, end_date: end })
        .eq("id", id);
      if (error) toast.error(error.message);
    },
    [onChange],
  );

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const days = Math.round((e.clientX - d.startX) / d.pxPerDay);
      if (days !== d.offsetDays) {
        d.offsetDays = days;
        setDrag({ id: d.id, offsetDays: days });
      }
    };
    const up = () => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (d && d.offsetDays) void shiftStage(d.id, d.offsetDays);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  }, [drag, shiftStage]);

  const finish = scheduled.length
    ? scheduled.reduce((m, s) => (parse(s.end_date)!.getTime() > m ? parse(s.end_date)!.getTime() : m), 0)
    : null;

  return (
    <div className="ss-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarRange size={15} style={{ color: "hsl(var(--ss-burgundy))" }} />
          <div className="ss-label">Project timeline</div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button className="ss-btn ss-btn-ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? "Done editing" : "Edit dates"}
          </button>
          <button className="ss-btn" onClick={() => void autoSchedule()} disabled={busy}>
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />} Auto-schedule
          </button>
        </div>
      </div>

      <div className="mt-1 text-[0.72rem] opacity-60">
        {projectStart ? `Starts ${fmt(projectStart)}` : "No start date set on this project"}
        {finish ? ` · projected finish ${fmt(toISO(new Date(finish)))}` : ""}
        {targetDate ? ` · target ${fmt(targetDate)}` : ""}
      </div>

      {!bounds ? (
        <div className="mt-3 text-[0.78rem] opacity-70">
          No dates yet. Hit Auto-schedule to lay every build stage out back-to-back from the project
          start date, then fine-tune any stage.
        </div>
      ) : (
        <div className="relative mt-3 space-y-1.5">
          {todayPct != null && (
            <div
              className="pointer-events-none absolute inset-y-0 z-10 w-px"
              style={{ left: `calc(40% + (60% * ${todayPct} / 100))`, background: "hsl(var(--ss-burgundy) / .6)" }}
            />
          )}
          {[...stages]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((s) => {
              const dragDays = drag?.id === s.id ? drag.offsetDays : 0;
              const sd = parse(s.start_date);
              const ed = parse(s.end_date);
              const has = sd && ed;
              const sdT = has ? sd!.getTime() + dragDays * DAY : 0;
              const edT = has ? ed!.getTime() + dragDays * DAY : 0;
              const left = has ? ((sdT - bounds.min) / bounds.span) * 100 : 0;
              const width = has ? Math.max(((edT - sdT + DAY) / bounds.span) * 100, 2) : 0;
              const complete = s.status === "complete";
              const late = has && !complete && edT < Date.now();
              return (
                <div key={s.id} className="flex items-center gap-2">
                  <div className="w-[40%] shrink-0 truncate text-[0.78rem]">
                    <span className="opacity-50">{s.sort_order}.</span> {s.name}
                  </div>
                  <div className="relative h-6 flex-1 rounded-full" style={{ background: "hsl(var(--ss-sand))" }}>
                    {has && (
                      <div
                        role="button"
                        tabIndex={0}
                        aria-label={`Drag to reschedule ${s.name}`}
                        className={`absolute inset-y-0 touch-none select-none rounded-full ${
                          drag?.id === s.id ? "cursor-grabbing ring-1 ring-offset-1" : "cursor-grab transition-all"
                        }`}
                        title={`${fmt(toISO(new Date(sdT)))} → ${fmt(toISO(new Date(edT)))} · drag to reschedule`}
                        onPointerDown={(e) => {
                          const track = e.currentTarget.parentElement as HTMLElement;
                          const pxPerDay = (track.getBoundingClientRect().width * DAY) / bounds.span;
                          if (!pxPerDay) return;
                          e.preventDefault();
                          dragRef.current = {
                            id: s.id,
                            startX: e.clientX,
                            pxPerDay,
                            baseStart: sd!.getTime(),
                            baseEnd: ed!.getTime(),
                            offsetDays: 0,
                          };
                          setDrag({ id: s.id, offsetDays: 0 });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "ArrowLeft") { e.preventDefault(); void shiftStage(s.id, -1); }
                          if (e.key === "ArrowRight") { e.preventDefault(); void shiftStage(s.id, 1); }
                        }}
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          background: complete
                            ? "hsl(var(--ss-burgundy) / .35)"
                            : late
                              ? "hsl(var(--ss-burgundy))"
                              : "hsl(var(--ss-burgundy) / .75)",
                        }}
                      />
                    )}
                  </div>
                  <div className="hidden w-[130px] shrink-0 text-right text-[0.7rem] opacity-60 sm:block">
                    {has ? `${fmt(toISO(new Date(sdT)))} – ${fmt(toISO(new Date(edT)))}` : "— – —"}
                  </div>
                </div>
              );
            })}

        </div>
      )}

      {editing && (
        <div className="mt-4 space-y-2 border-t pt-3" style={{ borderColor: "hsl(var(--ss-sand))" }}>
          {[...stages]
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((s) => (
              <div key={s.id} className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_auto_auto_auto]">
                <div className="truncate text-[0.78rem]">
                  <span className="opacity-50">{s.sort_order}.</span> {s.name}
                </div>
                <input
                  type="date"
                  className="ss-input"
                  value={s.start_date ?? ""}
                  onChange={(e) => void patch(s.id, "start_date", e.target.value)}
                />
                <input
                  type="date"
                  className="ss-input"
                  value={s.end_date ?? ""}
                  onChange={(e) => void patch(s.id, "end_date", e.target.value)}
                />
                <div className="flex items-center gap-1 text-[0.72rem] opacity-70">
                  <input
                    type="number"
                    min={1}
                    className="ss-input w-16"
                    value={s.duration_days}
                    onChange={(e) => void patch(s.id, "duration_days", e.target.value)}
                  />
                  days
                </div>
              </div>
            ))}
          <div className="text-[0.7rem] opacity-60">
            Days drive Auto-schedule — set them once and rebuild the timeline any time the start
            date moves.
          </div>
        </div>
      )}
    </div>
  );
}
