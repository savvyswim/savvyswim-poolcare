import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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
}

export interface BookingsReport {
  range: BookingsRange;
  total: number;
  needFollowUp: number;
  today: number;
  week: number;
  bookings: BookingRow[];
}

const RangeInput = z.object({
  range: z.enum(["7d", "30d", "90d", "all"]).default("30d"),
});

const StatusInput = z.object({
  id: z.string().uuid(),
  status: z.enum(["new", "contacted", "scheduled", "closed"]),
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
        "id, created_at, reference_number, full_name, phone, email, address, preferred_date, preferred_contact_time, source, status, notes",
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

    const bookings: BookingRow[] = (rows ?? [])
      .filter((r) => isBooking((r.source as string) ?? null, (r.preferred_date as string) ?? null))
      .map((r) => ({
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

    const now = Date.now();
    const within = (ms: number) =>
      bookings.filter((b) => now - new Date(b.created_at).getTime() <= ms).length;

    return {
      range: data.range,
      total: bookings.length,
      needFollowUp: bookings.filter((b) => !b.status || b.status === "new").length,
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
