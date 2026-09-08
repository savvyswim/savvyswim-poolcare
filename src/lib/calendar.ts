// Calendar helpers, build .ics files and Google Calendar links for pool visits.

export type CalendarEvent = {
  title: string;
  description?: string;
  location?: string;
  /** YYYY-MM-DD */
  date: string;
  /** 24h start hour, e.g. 8 */
  startHour: number;
  /** 24h end hour, e.g. 10 */
  endHour: number;
};

function stamp(date: string, hour: number) {
  const d = new Date(`${date}T00:00:00`);
  d.setHours(hour, 0, 0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(
    d.getMinutes(),
  )}00`;
}

function escapeIcs(v: string) {
  return v.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcs(event: CalendarEvent) {
  const uid = `savvyswim-${event.date}-${event.startHour}@savvyswim.com`;
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Savvy Swim//Portal//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp(event.date, event.startHour)}`,
    `DTSTART:${stamp(event.date, event.startHour)}`,
    `DTEND:${stamp(event.date, event.endHour)}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    event.location ? `LOCATION:${escapeIcs(event.location)}` : "",
    event.description ? `DESCRIPTION:${escapeIcs(event.description)}` : "",
    "BEGIN:VALARM",
    "TRIGGER:-PT2H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Savvy Swim pool visit today",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

export function downloadIcs(event: CalendarEvent, filename = "savvy-swim-visit.ics") {
  const blob = new Blob([buildIcs(event)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function googleCalendarUrl(event: CalendarEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${stamp(event.date, event.startHour)}/${stamp(event.date, event.endHour)}`,
    ..(event.description ? { details: event.description } : {}),
    ..(event.location ? { location: event.location } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
