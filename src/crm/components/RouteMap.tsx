import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import type { Stop } from "@/crm/pages/Route";

const KEY = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY as string | undefined;
const CHANNEL = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID as string | undefined;

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    google?: any;
    __ssMapReady?: () => void;
  }
}

function loadMaps(): Promise<void> {
  if (!KEY) return Promise.reject(new Error("no key"));
  if (window.google?.maps) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("ss-gmaps");
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("load failed")));
      return;
    }
    window.__ssMapReady = () => resolve();
    const s = document.createElement("script");
    s.id = "ss-gmaps";
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&loading=async&callback=__ssMapReady${
      CHANNEL ? `&channel=${CHANNEL}` : ""
    }`;
    s.onerror = () => reject(new Error("load failed"));
    document.head.appendChild(s);
  });
}

export default function RouteMap({
  stops,
  onSelect,
}: {
  stops: Stop[];
  onSelect: (s: Stop) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(!KEY);

  const geo = useMemo(
    () => stops.filter((s) => s.ss_customers.lat != null && s.ss_customers.lng != null),
    [stops],
  );

  useEffect(() => {
    if (!KEY || !ref.current || !geo.length) return;
    let cancelled = false;
    loadMaps()
      .then(() => {
        if (cancelled || !ref.current || !window.google) return;
        const map = new window.google.maps.Map(ref.current, {
          zoom: 10,
          center: { lat: Number(geo[0].ss_customers.lat), lng: Number(geo[0].ss_customers.lng) },
          disableDefaultUI: true,
          zoomControl: true,
        });
        const bounds = new window.google.maps.LatLngBounds();
        const path: { lat: number; lng: number }[] = [];

        geo.forEach((s: Stop) => {
          const pos = { lat: Number(s.ss_customers.lat), lng: Number(s.ss_customers.lng) };
          bounds.extend(pos);
          path.push(pos);
          const done = s.status === "completed";
          const marker = new window.google!.maps.Marker({
            position: pos,
            map,
            label: { text: done ? "✓" : String(s.stop_order), color: "#fff", fontWeight: "700", fontSize: "12px" },
            icon: {
              path: window.google!.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: done ? "#1E8A4C" : "#8E1F2C",
              fillOpacity: 1,
              strokeColor: "#F4EFE3",
              strokeWeight: 2,
            },
          });
          marker.addListener("click", () => onSelect(s));
        });

        new window.google.maps.Polyline({
          path,
          map,
          strokeOpacity: 0,
          icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, strokeColor: "#8E1F2C", scale: 3 }, offset: "0", repeat: "14px" }],
        });

        map.fitBounds(bounds, 48);
      })
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
    };
  }, [geo, onSelect]);

  if (failed || !geo.length) {
    return (
      <div className="ss-card p-4">
        <div className="mb-3 flex items-center gap-2 text-[0.8rem] opacity-70">
          <MapPin size={14} /> Map view needs the Google Maps connection. Drive order shown below.
        </div>
        <div className="space-y-1.5">
          {stops.map((s) => (
            <button
              key={s.id}
              className="flex w-full items-center gap-3 rounded-[10px] border p-2.5 text-left"
              style={{ borderColor: "hsl(var(--ss-sand))" }}
              onClick={() => onSelect(s)}
            >
              <span
                className="ss-num flex h-7 w-7 items-center justify-center rounded-full text-[0.75rem] font-bold"
                style={{
                  background: s.status === "completed" ? "hsl(var(--ss-green))" : "hsl(var(--ss-burgundy))",
                  color: "#fff",
                }}
              >
                {s.status === "completed" ? "✓" : s.stop_order}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[0.85rem] font-medium">{s.ss_customers.full_name}</span>
                <span className="block truncate text-[0.72rem] opacity-65">
                  {s.ss_customers.address}, {s.ss_customers.city}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <div ref={ref} className="ss-card h-[460px] w-full overflow-hidden" />;
}
