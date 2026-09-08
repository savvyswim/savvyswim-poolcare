import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { SERVICE_LOCATIONS } from "@/lib/service-locations";

/**
 * Multi-marker static maps rendered through the Maps connector gateway.
 *
 * Runs server-side, so the map works identically on savvyswim.com and
 * savvyswim.com where the shared browser key is referrer-blocked.
 */

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const BRAND_PIN = "0x8E1F2C";

function gatewayHeaders() {
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableApiKey || !mapsKey) throw new Error("Missing Google Maps connector credentials");
  return {
    Authorization: `Bearer ${lovableApiKey}`,
    "X-Connection-Api-Key": mapsKey,
  };
}

async function staticMap(markers: string[], size: string, zoomHint?: number): Promise<string | null> {
  if (!markers.length) return null;
  const params = [
    `size=${size}`,
    "scale=2",
    "maptype=roadmap",
    ...(zoomHint ? [`zoom=${zoomHint}`] : []),
    ...markers.map((m) => `markers=${encodeURIComponent(`color:${BRAND_PIN}|${m}`)}`),
  ].join("&");

  const res = await fetch(`${GATEWAY_URL}/maps/api/staticmap?${params}`, {
    headers: gatewayHeaders(),
  });
  if (!res.ok) {
    console.error(`Static area map failed [${res.status}]: ${await res.text()}`);
    return null;
  }
  const buf = await res.arrayBuffer();
  const base64 = Buffer.from(buf).toString("base64");
  return `data:${res.headers.get("content-type") ?? "image/png"};base64,${base64}`;
}

/** Public: one pin per city we serve. No input, safe to cache. */
export const serviceAreaMap = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ image: string | null }> => {
    try {
      const markers = SERVICE_LOCATIONS.map((l) => `${l.lat},${l.lng}`);
      return { image: await staticMap(markers, "640x420") };
    } catch (err) {
      console.error("service area map failed", err);
      return { image: null };
    }
  },
);

const PoolMapSchema = z.object({ limit: z.number().int().min(1).max(60).default(40) });

export type PoolMapPin = {
  id: string;
  label: string;
  city: string | null;
  address: string;
  routeDay: string | null;
};

/** Staff only: real pool locations from the CRM, plotted on one map. */
export const crmPoolMap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => PoolMapSchema.parse(input ?? {}))
  .handler(async ({ data, context }): Promise<{ image: string | null; pins: PoolMapPin[] }> => {
    const { data: isOffice } = await (
      context.supabase as unknown as {
        rpc: (fn: "ss_is_office") => Promise<{ data: unknown }>;
      }
    ).rpc("ss_is_office");
    if (isOffice !== true) throw new Error("Office access required");


    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("ss_customers")
      .select("id, full_name, address, city, route_day, status")
      .eq("status", "active")
      .not("address", "is", null)
      .limit(data.limit);

    if (error) {
      console.error("pool map query failed", error.message);
      return { image: null, pins: [] };
    }

    const pins: PoolMapPin[] = (rows ?? [])
      .filter((r) => (r.address ?? "").trim().length > 4)
      .map((r) => ({
        id: r.id as string,
        label: (r.full_name as string) ?? "Pool",
        city: (r.city as string) ?? null,
        address: `${r.address}${r.city ? `, ${r.city}` : ""}, TX`,
        routeDay: (r.route_day as string) ?? null,
      }));

    let image: string | null = null;
    try {
      image = await staticMap(
        pins.slice(0, 40).map((p) => p.address),
        "640x480",
      );
    } catch (err) {
      console.error("pool map render failed", err);
    }

    return { image, pins };
  });
