import { useState } from "react";
import { Route as RouteIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { optimizeRoute } from "@/crm/lib/routeOptimize";

type Input = { id: string; lat: number | null; lng: number | null };

/** Office/tech tool: re-orders today's remaining stops into the shortest drive. */
export default function RouteOptimizer({
  stops,
  onOptimized,
}: {
  stops: Input[];
  onOptimized: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [summary, setSummary] = useState<{ miles: number; minutes: number } | null>(null);

  const run = async () => {
    if (stops.length < 2) {
      toast.info("Need at least two remaining stops to optimize");
      return;
    }
    setBusy(true);
    const here = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => resolve(null),
        { timeout: 4000 },
      );
    });

    const { ordered, unlocated, totalMiles, totalMinutes } = optimizeRoute(stops, here);
    if (!ordered.length) {
      setBusy(false);
      toast.error("No stops have map coordinates yet — add addresses with lat/lng first");
      return;
    }

    const updates = ordered.map((o) =>
      supabase
        .from("ss_visits")
        .update({ stop_order: o.order, drive_minutes: o.minutes, drive_miles: o.miles })
        .eq("id", o.id),
    );
    const results = await Promise.all(updates);
    setBusy(false);
    const failed = results.find((r) => r.error);
    if (failed?.error) {
      toast.error(failed.error.message);
      return;
    }
    setSummary({ miles: totalMiles, minutes: totalMinutes });
    toast.success(
      `Route optimized · ${totalMiles} mi · ${totalMinutes} min drive` +
        (unlocated.length ? ` · ${unlocated.length} stop(s) skipped (no coordinates)` : ""),
    );
    onOptimized();
  };

  return (
    <div className="flex items-center gap-2">
      <button className="ss-btn ss-btn-aqua" disabled={busy} onClick={run}>
        <RouteIcon size={13} /> {busy ? "Optimizing…" : "Optimize route"}
      </button>
      {summary && (
        <span className="ss-num text-[0.72rem] opacity-70">
          {summary.miles} mi · {summary.minutes} min
        </span>
      )}
    </div>
  );
}
