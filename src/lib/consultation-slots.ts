/**
 * Consultation day and time options offered on the thank you page.
 *
 * Everything is worked out in Dallas time so the visitor and our office always
 * see the same day. Sunday is closed, Saturday runs short hours, and a same day
 * visit is only offered while it is still morning here, with at least a two
 * hour head start for the crew.
 */

export const CONSULT_TZ = "America/Chicago";

/** Latest local hour at which a same day request is still accepted. */
export const SAME_DAY_CUTOFF_HOUR = 12;

/** Head start the crew needs before the start of a slot. */
const LEAD_HOURS = 2;

export type ConsultSlot = {
  id: string;
  label: string;
  detail: string;
  /** Local start hour, used to drop slots that are already too close. */
  start: number;
};

const WEEKDAY_SLOTS: ConsultSlot[] = [
  { id: "morning", label: "Morning", detail: "8:00 AM to 11:00 AM", start: 8 },
  { id: "midday", label: "Midday", detail: "11:00 AM to 2:00 PM", start: 11 },
  { id: "afternoon", label: "Afternoon", detail: "2:00 PM to 6:00 PM", start: 14 },
];

const SATURDAY_SLOTS: ConsultSlot[] = [
  { id: "morning", label: "Morning", detail: "9:00 AM to 11:00 AM", start: 9 },
  { id: "midday", label: "Midday", detail: "11:00 AM to 2:00 PM", start: 11 },
];

export type ConsultDay = {
  /** YYYY-MM-DD */
  date: string;
  /** e.g. "Wed" */
  weekday: string;
  /** e.g. "Sep 24" */
  dayLabel: string;
  /** True for today, when a same day request is still possible. */
  sameDay: boolean;
  slots: ConsultSlot[];
};

type LocalNow = { year: number; month: number; day: number; hour: number };

/** Current date and hour in Dallas time. */
export function localNow(now: Date = new Date()): LocalNow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CONSULT_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
  };
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

/**
 * The days and windows a visitor may choose from, starting with today when a
 * same day visit is still on the table.
 */
export function consultationDays(now: Date = new Date(), howMany = 6): ConsultDay[] {
  const here = localNow(now);
  const base = Date.UTC(here.year, here.month - 1, here.day);
  const days: ConsultDay[] = [];

  for (let offset = 0; days.length < howMany && offset < 21; offset += 1) {
    const d = new Date(base + offset * 86_400_000);
    const weekdayIndex = d.getUTCDay();
    if (weekdayIndex === 0) continue; // Sunday, closed

    const all = weekdayIndex === 6 ? SATURDAY_SLOTS : WEEKDAY_SLOTS;
    const isToday = offset === 0;

    // Same day only while it is still morning here, and only for windows the
    // crew can still reach in time.
    if (isToday && here.hour >= SAME_DAY_CUTOFF_HOUR) continue;
    const slots = isToday ? all.filter((s) => s.start >= here.hour + LEAD_HOURS) : all;
    if (slots.length === 0) continue;

    days.push({
      date: iso(d),
      weekday: d.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }),
      dayLabel: d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      sameDay: isToday,
      slots,
    });
  }

  return days;
}

/** Check a picked day and window against the options we actually offered. */
export function findConsultChoice(
  date: string,
  slotId: string,
  now: Date = new Date(),
): { day: ConsultDay; slot: ConsultSlot } | null {
  const day = consultationDays(now, 8).find((d) => d.date === date);
  if (!day) return null;
  const slot = day.slots.find((s) => s.id === slotId);
  if (!slot) return null;
  return { day, slot };
}
