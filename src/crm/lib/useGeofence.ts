import { useEffect, useRef, useState } from "react";
import type { Stop } from "@/crm/pages/Route";

type Args = {
  enabled: boolean;
  stops: Stop[];
  radiusFeet: number;
  dwellMinutes: number;
  onArrive: (stop: Stop) => void | Promise<void>;
  onDwell: (stop: Stop) => void;
};

const FEET_PER_METER = 3.28084;

function distanceMeters(aLat: number, aLng: number, bLat: number, bLng: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Watches the technician's position and fires arrival + dwell callbacks.
 * Degrades silently to manual buttons when permission is denied or unavailable.
 */
export function useGeofence({ enabled, stops, radiusFeet, dwellMinutes, onArrive, onDwell }: Args) {
  const [permission, setPermission] = useState<"unknown" | "granted" | "denied">("unknown");
  const watchId = useRef<number | null>(null);
  const arrived = useRef<Set<string>>(new Set());
  const dwellStart = useRef<Record<string, number>>({});
  const dwelled = useRef<Set<string>>(new Set());
  const stopsRef = useRef(stops);
  stopsRef.current = stops;

  const start = () => {
    if (!("geolocation" in navigator) || watchId.current !== null) return;
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setPermission("granted");
        const radiusM = radiusFeet / FEET_PER_METER;
        const now = Date.now();
        for (const stop of stopsRef.current) {
          const { lat, lng } = stop.ss_customers;
          if (lat == null || lng == null) continue;
          const inside =
            distanceMeters(pos.coords.latitude, pos.coords.longitude, Number(lat), Number(lng)) <= radiusM;
          if (!inside) {
            delete dwellStart.current[stop.id];
            continue;
          }
          if (!arrived.current.has(stop.id)) {
            arrived.current.add(stop.id);
            void onArrive(stop);
          }
          dwellStart.current[stop.id] ??= now;
          if (
            !dwelled.current.has(stop.id) &&
            now - dwellStart.current[stop.id] >= dwellMinutes * 60_000
          ) {
            dwelled.current.add(stop.id);
            onDwell(stop);
          }
        }
      },
      () => setPermission("denied"),
      { enableHighAccuracy: true, maximumAge: 15_000, timeout: 30_000 },
    );
  };

  useEffect(() => {
    if (!enabled) return;
    if (!("permissions" in navigator)) return;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((res) => {
        if (res.state === "granted") start();
        else if (res.state === "denied") setPermission("denied");
      })
      .catch(() => undefined);
    return () => {
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  return { permission, request: start };
}
