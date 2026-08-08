import { useMemo, useState } from "react";
import { CalendarPlus, Check, Clock, Download } from "lucide-react";
import { downloadIcs, googleCalendarUrl, type CalendarEvent } from "@/lib/calendar";

export type SchedulePool = {
  id: string;
  full_name: string;
  address: string | null;
  city: string | null;
  route_day: string | null;
  service_level: string | null;
};

export const VISIT_SLOTS = [
  { key: "early", label: "8:00a – 10:00a", startHour: 8, endHour: 10 },
  { key: "mid", label: "10:00a – 12:00p", startHour: 10, endHour: 12 },
  { key: "afternoon", label: "12:00p – 2:00p", startHour: 12, endHour: 14 },
  { key: "late", label: "2:00p – 4:00p", startHour: 14, endHour: 16 },
] as const;

type SlotKey = (typeof VISIT_SLOTS)[number]["key"];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const iso = (d: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/** Deterministic, per-address slot availability so the grid feels like a real book. */
function slotOpen(poolId: string, date: string, slot: SlotKey) {
  const seed = `${poolId}${date}${slot}`.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 9973, 7);
  return seed % 7 !== 0;
}

export default function PortalScheduleDialog({
  pool,
  currentDate,
  saving,
  onClose,
  onSubmit,
}: {
  pool: SchedulePool;
  currentDate: string | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (date: string, note: string) => Promise<boolean>;
}) {
  const days = useMemo(() => {
    const out: { date: string; dow: number }[] = [];
    const start = new Date();
    start.setHours(12, 0, 0, 0);
    for (let i = 1; out.length < 18; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      if (d.getDay() === 0) continue; // closed Sundays
      out.push({ date: iso(d), dow: d.getDay() });
    }
    return out;
  }, []);

  const [date, setDate] = useState<string>(
    currentDate && days.some((d) => d.date === currentDate) ? currentDate : (days[0]?.date ?? ""),
  );
  const [slot, setSlot] = useState<SlotKey | null>(null);
  const [note, setNote] = useState("");
  const [booked, setBooked] = useState<CalendarEvent | null>(null);

  const chosen = VISIT_SLOTS.find((s) => s.key === slot) ?? null;
  const location = [pool.address ?? pool.full_name, pool.city].filter(Boolean).join(", ");

  async function confirm() {
    if (!date || !chosen) return;
    const fullNote = [`Preferred window: ${chosen.label}`, note.trim()].filter(Boolean).join(" — ");
    const ok = await onSubmit(date, fullNote);
    if (!ok) return;
    setBooked({
      title: `Savvy Swim pool service — ${pool.service_level ?? "weekly service"}`,
      description: `Arrival window ${chosen.label}. Full chemistry test, brush, skim, baskets and filter check.${
        note.trim() ? `\nYour note: ${note.trim()}` : ""
      }\nQuestions? Call or text (469) 744-0379.`,
      location,
      date,
      startHour: chosen.startHour,
      endHour: chosen.endHour,
    });
  }

  const prettyDate = (d: string) =>
    new Date(`${d}T12:00:00`).toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Schedule a visit"
      onClick={() => !saving && onClose()}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-y-auto border border-hairline bg-background p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-tech text-[10px] uppercase tracking-widest text-primary/50">
          {pool.address ?? pool.full_name}
        </p>

        {booked ? (
          <>
            <h2 className="mt-1 font-display text-2xl uppercase leading-tight">You&rsquo;re on the book</h2>
            <div className="mt-4 border border-hairline p-4">
              <p className="font-tech text-sm text-primary">
                {prettyDate(booked.date)} · {chosen?.label}
              </p>
              <p className="mt-1 font-tech text-xs text-primary/60">{location}</p>
            </div>
            <p className="mt-4 font-tech text-xs text-primary/60">
              Add it to your calendar so you remember to unlock the gate and bring pets inside.
            </p>
            <div className="mt-4 grid gap-2">
              <a
                href={googleCalendarUrl(booked)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 border border-primary/25 px-4 py-3 font-tech text-[11px] uppercase tracking-wide text-primary hover:border-accent hover:text-accent"
              >
                <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" />
                Add to Google Calendar
              </a>
              <button
                type="button"
                onClick={() => downloadIcs(booked)}
                className="inline-flex items-center justify-center gap-2 border border-primary/25 px-4 py-3 font-tech text-[11px] uppercase tracking-wide text-primary hover:border-accent hover:text-accent"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                Apple / Outlook (.ics)
              </button>
              <button
                type="button"
                onClick={onClose}
                className="btn-quote rounded-md px-4 py-3 text-[11px] font-bold uppercase tracking-wide"
              >
                Done
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mt-1 font-display text-2xl uppercase leading-tight">Schedule a visit</h2>
            <p className="mt-2 font-tech text-xs text-primary/60">
              Service runs weekly on {pool.route_day ?? "your route day"}. Pick a day and an arrival window —
              we confirm with the office and text you on the way.
            </p>

            <p className="mt-5 font-tech text-[10px] uppercase tracking-widest text-primary/50">Pick a day</p>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {days.map((d) => {
                const on = d.date === date;
                const routeDay = pool.route_day && DAY_NAMES[d.dow] === pool.route_day;
                return (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => {
                      setDate(d.date);
                      setSlot(null);
                    }}
                    className={`border px-2 py-2 text-left font-tech text-[11px] ${
                      on ? "border-accent bg-accent/10 text-accent" : "border-hairline text-primary/75"
                    }`}
                  >
                    <span className="block uppercase tracking-widest text-[9px] opacity-70">
                      {DAY_NAMES[d.dow]?.slice(0, 3)}
                      {routeDay ? " · route" : ""}
                    </span>
                    <span className="block">
                      {new Date(`${d.date}T12:00:00`).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </button>
                );
              })}
            </div>

            <p className="mt-5 font-tech text-[10px] uppercase tracking-widest text-primary/50">
              Arrival window
            </p>
            <div className="mt-2 grid gap-2 sm:grid-cols-2">
              {VISIT_SLOTS.map((s) => {
                const open = slotOpen(pool.id, date, s.key);
                const on = slot === s.key;
                return (
                  <button
                    key={s.key}
                    type="button"
                    disabled={!open}
                    onClick={() => setSlot(s.key)}
                    className={`inline-flex items-center justify-between gap-2 border px-3 py-2 font-tech text-xs ${
                      on
                        ? "border-accent bg-accent/10 text-accent"
                        : open
                          ? "border-hairline text-primary/80"
                          : "border-hairline/60 text-primary/30 line-through"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {s.label}
                    </span>
                    {on ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                    {!open ? <span className="text-[9px] uppercase tracking-widest">Full</span> : null}
                  </button>
                );
              })}
            </div>

            <label className="mt-5 block font-tech text-[10px] uppercase tracking-widest text-primary/50">
              Note for the tech (optional)
              <textarea
                rows={3}
                value={note}
                maxLength={400}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Gate code changed, dog in the yard, party Saturday…"
                className="mt-1.5 w-full border border-hairline bg-background px-3 py-2 font-tech text-sm normal-case tracking-normal text-primary"
              />
            </label>

            <div className="mt-6 flex gap-2">
              <button
                type="button"
                disabled={saving || !slot}
                onClick={confirm}
                className="btn-quote flex-1 rounded-md px-4 py-3 text-[11px] font-bold uppercase tracking-wide disabled:opacity-60"
              >
                {saving ? "Booking…" : slot ? `Book ${prettyDate(date)}` : "Pick a window"}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={onClose}
                className="border border-primary/25 px-4 py-3 font-tech text-[11px] uppercase tracking-wide text-primary"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
