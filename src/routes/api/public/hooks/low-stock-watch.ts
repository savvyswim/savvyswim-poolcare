/**
 * Daily low-stock sweep.
 *
 * pg_cron hits this once a morning: any inventory item at or below its reorder
 * point files an office alert and notifies ops (email + SMS), deduped 24h per
 * item so the same shortage doesn't text every day it stays low.
 *
 * Public route: no caller input drives writes and no PII is returned.
 */
import { createFileRoute } from "@tanstack/react-router";

import { guardOpsHook } from "@/lib/ops-hook-auth.server";

export const Route = createFileRoute("/api/public/hooks/low-stock-watch")({
  server: {
    handlers: {
      POST: async ({ request }) => run(request),
      GET: async ({ request }) => run(request),
    },
  },
});

async function run(request: Request) {
  const denied = guardOpsHook(request, "low-stock-watch");
  if (denied) return denied;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { dispatchLowStock } = await import("@/lib/inventory-alerts.server");
    const { data, error } = await supabaseAdmin
      .from("ss_inventory")
      .select("id,name,unit,quantity,low_threshold");
    if (error) return Response.json({ ok: false, error: error.message }, { status: 500 });
    const result = await dispatchLowStock((data ?? []) as never);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
