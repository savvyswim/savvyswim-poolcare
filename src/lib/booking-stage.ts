/**
 * Where a booking request stands, worked out from what already happened:
 * the request status, the follow up log and any visit on the schedule.
 * Shared by the bookings list, the follow up page and the calendar.
 */
import { SERVICE_LOCATIONS } from "@/lib/service-locations";

export const BOOKING_STAGES = [
  "new",
  "contacted",
  "confirmation_sent",
  "booked",
  "visit_done",
] as const;
export type BookingStage = (typeof BOOKING_STAGES)[number] | "lost";

export const STAGE_LABEL: Record<BookingStage, string> = {
  new: "New",
  contacted: "Contacted",
  confirmation_sent: "Confirmation sent",
  booked: "Booked",
  visit_done: "Visit done",
  lost: "Lost",
};

export const CONFIRMATION_PREFIX = "Booking confirmation";
export const FOLLOW_UP_PREFIX = "Office follow up";

export function deriveStage(input: {
  status: string | null;
  events: { event_type: string; outcome: string | null; detail: string | null }[];
  visitStatuses: string[];
}): BookingStage {
  const status = input.status ?? "new";
  if (status === "declined") return "lost";
  if (status === "converted" || input.visitStatuses.includes("completed")) return "visit_done";
  if (status === "scheduled" || status === "confirmed" || input.visitStatuses.length > 0)
    return "booked";
  const sent = input.events.filter(
    (e) => (e.event_type === "email_sent" || e.event_type === "sms_sent") && e.outcome !== "failed",
  );
  if (sent.some((e) => (e.detail ?? "").startsWith(CONFIRMATION_PREFIX))) return "confirmation_sent";
  if (sent.some((e) => (e.detail ?? "").startsWith(FOLLOW_UP_PREFIX))) return "contacted";
  return "new";
}

export function isPlaceholderEmail(email: string | null | undefined): boolean {
  return !email || email.toLowerCase().startsWith("no-email.");
}

export const OTHER_AREA = "Other DFW";
export const AREA_NAMES = SERVICE_LOCATIONS.map((l) => l.name);

/** Match a free text address or city to one of the route cities. */
export function areaFor(text: string | null | undefined): string {
  const t = (text ?? "").toLowerCase();
  // Longer names first so "University Park" wins over "Park" style overlaps.
  const sorted = [...AREA_NAMES].sort((a, b) => b.length - a.length);
  return sorted.find((n) => t.includes(n.toLowerCase())) ?? OTHER_AREA;
}
