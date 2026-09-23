/**
 * Consultation day and time options offered on the thank you page.
 *
 * Everything is worked out in Dallas time so the visitor and our office always
 * see the same day. We offer the next seven days, Monday to Friday only, with
 * three arrival times, and a same day visit while a time is still far enough
 * out for the crew to get there.
 */

export const CONSULT_TZ = "America/Chicago";

/** Head start the crew needs before the start of a slot. */
const LEAD_HOURS = 2;

/** How many calendar days ahead the picker looks. */
const WINDOW_DAYS = 7;

export type ConsultSlot = {
  id: string;
  label: string;
  detail: string;
  /** Local start hour, used to drop slots that are already too close. */
  start: number;
};

const hourLabel = (h: number) => `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? "PM" : "AM"}`;
const hourId = (h: number) => `${h > 12 ? h - 12 : h}${h >= 12 ? "pm" : "am"}`;
const hourGroup = (h: number) => (h < 12 ? "Morning" : h < 14 ? "Midday" : "Afternoon");

/** Hourly arrivals 8 AM to 5 PM, Monday to Friday, so every visit ends by 6 PM. */
const START_TIMES: ConsultSlot[] = Array.from({ length: 10 }, (_, i) => {
  const h = 8 + i;
  return { id: hourId(h), label: hourLabel(h), detail: hourGroup(h), start: h };
});

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
 * The weekdays and arrival times a visitor may choose from within the next
 * seven days, starting with today when a same day visit is still on the table.
 */
export function consultationDays(now: Date = new Date()): ConsultDay[] {
  const here = localNow(now);
  const base = Date.UTC(here.year, here.month - 1, here.day);
  const days: ConsultDay[] = [];

  for (let offset = 0; offset < WINDOW_DAYS; offset += 1) {
    const d = new Date(base + offset * 86_400_000);
    const weekdayIndex = d.getUTCDay();
    if (weekdayIndex === 0 || weekdayIndex === 6) continue; // weekend, no consultations

    const isToday = offset === 0;
    // Today only counts while a start time is still far enough out for the crew.
    const slots = isToday
      ? START_TIMES.filter((s) => s.start >= here.hour + LEAD_HOURS)
      : START_TIMES;
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

/** Check a picked day and time against the options we actually offered. */
export function findConsultChoice(
  date: string,
  slotId: string,
  now: Date = new Date(),
): { day: ConsultDay; slot: ConsultSlot } | null {
  const day = consultationDays(now).find((d) => d.date === date);
  if (!day) return null;
  const slot = day.slots.find((s) => s.id === slotId);
  if (!slot) return null;
  return { day, slot };
}
