import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { deriveStage, type BookingStage } from "@/lib/booking-stage";

/**
 * Booking requests dashboard: the appointment-style requests that came from
 * the booking and schedule pages, or any request that named a preferred date.
 * Office/owner only.
 */

export type BookingsRange = "7d" | "30d" | "90d" | "all";

export interface BookingRow {
  id: string;
  created_at: string;
  reference_number: string | null;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  preferred_date: string | null;
  preferred_contact_time: string | null;
  source: string | null;
  status: string | null;
  notes: string | null;
  stage: BookingStage;
}

export interface BookingsReport {
  range: BookingsRange;
  total: number;
  needFollowUp: number;
  today: number;
  week: number;
  booked: number;
  bookingRate: number;
  repliedNotBooked: number;
  bookings: BookingRow[];
}

const RangeInput = z.object({
  range: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
});

const StatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "scheduled", "confirmed", "declined", "converted"]),
});

function startOf(range: BookingsRange): string | null {
  if (range === "all") return null;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

/** The service area is the city inside the free-text address. */
function cityFromAddress(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return parts[parts.length - 2]?.replace(/\s+TX.*$/i, "").trim() || null;
}

function isBooking(source: string | null, preferredDate: string | null): boolean {
  const s = (source || "").toLowerCase();
  return Boolean(preferredDate) || /book|schedule|appointment|consult/.test(s);
}

async function assertOffice(supabase: unknown): Promise<void> {
  const { data: isOffice } = await (
    supabase as { rpc: (fn: "ss_is_office") => Promise<{ data: unknown }> }
  ).rpc("ss_is_office");
  if (isOffice !== true) throw new Error("Office access required");
}

export const getBookingsReport = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RangeInput.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<BookingsReport> => {
    await assertOffice(context.supabase);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("inspection_requests")
      .select(
        "id, created_at, reference_number, full_name, phone, email, address, preferred_date, preferred_contact_time, source, status, notes, converted_customer_id",
      )
      .order("created_at", { ascending: false })
      .limit(1000);

    const since = startOf(data.range);
    if (since) query = query.gte("created_at", since);

    const { data: rows, error } = await query;
    if (error) {
      console.error("bookings report failed", error.message);
      throw new Error("Could not load booking requests");
    }

    const kept = (rows ?? []).filter((r) =>
      isBooking((r.source as string) ?? null, (r.preferred_date as string) ?? null),
    );
    const ids = kept.map((r) => r.id as string);
    const custIds = kept.map((r) => r.converted_customer_id as string | null).filter(Boolean) as string[];
    const eventsBy = new Map<string, { event_type: string; outcome: string | null; detail: string | null }[]>();
    for (let i = 0; i < ids.length; i += 200) {
      const { data: evs } = await supabaseAdmin
        .from("inspection_events")
        .select("request_id, event_type, outcome, detail")
        .in("request_id", ids.slice(i, i + 200));
      for (const e of evs ?? []) {
        const k = e.request_id as string;
        if (!eventsBy.has(k)) eventsBy.set(k, []);
        eventsBy.get(k)!.push(e as never);
      }
    }
    const visitsBy = new Map<string, string[]>();
    for (let i = 0; i < custIds.length; i += 200) {
      const { data: vs } = await supabaseAdmin
        .from("ss_visits")
        .select("customer_id, status")
        .in("customer_id", custIds.slice(i, i + 200));
      for (const v of vs ?? []) {
        const k = v.customer_id as string;
        if (!visitsBy.has(k)) visitsBy.set(k, []);
        visitsBy.get(k)!.push(v.status as string);
      }
    }

    const bookings: BookingRow[] = kept
      .map((r) => ({
        stage: deriveStage({
          status: (r.status as string) ?? null,
          events: eventsBy.get(r.id as string) ?? [],
          visitStatuses: r.converted_customer_id
            ? (visitsBy.get(r.converted_customer_id as string) ?? [])
            : [],
        }),
        id: r.id as string,
        created_at: r.created_at as string,
        reference_number: (r.reference_number as string) ?? null,
        full_name: (r.full_name as string) ?? null,
        phone: (r.phone as string) ?? null,
        email: (r.email as string) ?? null,
        address: (r.address as string) ?? null,
        city: cityFromAddress((r.address as string) ?? null),
        preferred_date: (r.preferred_date as string) ?? null,
        preferred_contact_time: (r.preferred_contact_time as string) ?? null,
        source: (r.source as string) ?? null,
        status: (r.status as string) ?? null,
        notes: (r.notes as string) ?? null,
      }));

    const booked = bookings.filter((b) => b.stage === "booked" || b.stage === "visit_done").length;
    const now = Date.now();
    const within = (ms: number) =>
      bookings.filter((b) => now - new Date(b.created_at).getTime() <= ms).length;

    return {
      range: data.range,
      total: bookings.length,
      needFollowUp: bookings.filter((b) => b.stage === "new").length,
      booked,
      bookingRate: bookings.length ? Math.round((booked / bookings.length) * 100) : 0,
      repliedNotBooked: bookings.filter(
        (b) => b.stage === "contacted" || b.stage === "confirmation_sent",
      ).length,
      today: within(86_400_000),
      week: within(7 * 86_400_000),
      bookings,
    };
  });

export const setBookingStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => StatusInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertOffice(context.supabase);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("inspection_requests")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) {
      console.error("booking status update failed", error.message);
      throw new Error("Could not update this booking");
    }
    return { ok: true, id: data.id, status: data.status };
  });
