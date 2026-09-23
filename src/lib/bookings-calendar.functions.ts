import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { areaFor } from "@/lib/booking-stage";

/**
 * Calendar of upcoming visits and requested bookings, grouped by service area.
 * Office/owner only.
 */

export interface CalendarEntry {
  key: string;
  kind: "visit" | "requested";
  date: string;
  name: string;
  window: string | null;
  city: string;
  area: string;
  status: string | null;
  requestId: string | null;
}

const Input = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

function windowFromNotes(notes: string | null): string | null {
  const m = /Arrival ([^.]+)\./.exec(notes ?? "");
  return m ? m[1]!.trim() : null;
}

function cityFromAddress(address: string | null): string {
  const parts = (address ?? "").split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length < 2) return parts[0] ?? "";
  return parts[parts.length - 2]!.replace(/\s+TX.*$/i, "").trim();
}

export const getCalendar = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data, context }): Promise<{ entries: CalendarEntry[] }> => {
    const { data: isOffice } = await context.supabase.rpc("ss_is_office");
    if (isOffice !== true) throw new Error("Office access required");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: visits, error } = await supabaseAdmin
      .from("ss_visits")
      .select("id, customer_id, scheduled_date, status, notes, ss_customers(full_name, address, city)")
      .gte("scheduled_date", data.from)
      .lte("scheduled_date", data.to)
      .order("scheduled_date")
      .limit(1000);
    if (error) {
      console.error("calendar visits failed", error.message);
      throw new Error("Could not load the calendar");
    }

    const custIds = [...new Set((visits ?? []).map((v) => v.customer_id as string))];
    const reqByCustomer = new Map<string, string>();
    if (custIds.length) {
      const { data: reqs } = await supabaseAdmin
        .from("inspection_requests")
        .select("id, converted_customer_id")
        .in("converted_customer_id", custIds);
      for (const r of reqs ?? []) reqByCustomer.set(r.converted_customer_id as string, r.id as string);
    }

    const entries: CalendarEntry[] = (visits ?? []).map((v) => {
      const c = (v.ss_customers ?? {}) as { full_name?: string; address?: string; city?: string };
      const city = c.city || cityFromAddress(c.address ?? null);
      return {
        key: `v-${v.id}`,
        kind: "visit",
        date: v.scheduled_date as string,
        name: c.full_name ?? "Pool owner",
        window: windowFromNotes(v.notes as string | null),
        city,
        area: areaFor(`${city} ${c.address ?? ""}`),
        status: v.status as string,
        requestId: reqByCustomer.get(v.customer_id as string) ?? null,
      };
    });

    // Requested days not yet on the schedule.
    const { data: reqs } = await supabaseAdmin
      .from("inspection_requests")
      .select("id, full_name, address, preferred_date, preferred_contact_time, status, converted_customer_id")
      .gte("preferred_date", data.from)
      .lte("preferred_date", data.to)
      .is("converted_customer_id", null)
      .limit(1000);
    for (const r of reqs ?? []) {
      if (r.status === "declined") continue;
      const city = cityFromAddress(r.address as string | null);
      entries.push({
        key: `r-${r.id}`,
        kind: "requested",
        date: r.preferred_date as string,
        name: (r.full_name as string) ?? "New request",
        window: (r.preferred_contact_time as string) ?? null,
        city,
        area: areaFor(`${city} ${r.address ?? ""}`),
        status: (r.status as string) ?? "new",
        requestId: r.id as string,
      });
    }

    return { entries };
  });
