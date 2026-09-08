/**
 * Single source of truth for published business hours.
 *
 * These must match the hours on the Google Business Profile exactly — Google
 * penalises listings whose website says something different. Change them here
 * and both the visible business-info card and the LocalBusiness structured
 * data update together.
 */

export interface BusinessHoursRow {
  /** Human label shown on the site. */
  label: string;
  /** schema.org dayOfWeek values covered by this row. */
  days: string[];
  /** 24h "HH:MM" open/close, or null when closed. */
  opens: string | null;
  closes: string | null;
  /** Human display, e.g. "8:00 AM – 6:00 PM". */
  display: string;
}

export const BUSINESS_HOURS: BusinessHoursRow[] = [
  {
    label: "Monday – Friday",
    days: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    opens: "08:00",
    closes: "18:00",
    display: "8:00 AM – 6:00 PM",
  },
  {
    label: "Saturday",
    days: ["Saturday"],
    opens: "09:00",
    closes: "14:00",
    display: "9:00 AM – 2:00 PM",
  },
  {
    label: "Sunday",
    days: ["Sunday"],
    opens: null,
    closes: null,
    display: "Closed · Swim Club emergency line",
  },
];

/** schema.org OpeningHoursSpecification built from the rows above. */
export const openingHoursSpecification = BUSINESS_HOURS.map((row) => ({
  "@type": "OpeningHoursSpecification",
  dayOfWeek: row.days.length === 1 ? row.days[0] : row.days,
  opens: row.opens ?? "00:00",
  closes: row.closes ?? "00:00",
}));
