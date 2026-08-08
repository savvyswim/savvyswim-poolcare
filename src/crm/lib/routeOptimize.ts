export type GeoStop = {
  id: string;
  lat: number | null;
  lng: number | null;
};

export type OptimizedStop = {
  id: string;
  order: number;
  miles: number;
  minutes: number;
};

const AVG_MPH = 32;

export function haversineMiles(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Nearest-neighbour ordering from an optional start point. Road factor ~1.25x straight line. */
export function optimizeRoute(
  stops: GeoStop[],
  start?: { lat: number; lng: number } | null,
): { ordered: OptimizedStop[]; unlocated: string[]; totalMiles: number; totalMinutes: number } {
  const located = stops.filter(
    (s): s is GeoStop & { lat: number; lng: number } => s.lat != null && s.lng != null,
  );
  const unlocated = stops.filter((s) => s.lat == null || s.lng == null).map((s) => s.id);

  const remaining = [...located];
  const ordered: OptimizedStop[] = [];
  let cursor = start ?? (remaining[0] ? { lat: remaining[0].lat, lng: remaining[0].lng } : null);
  let totalMiles = 0;

  while (remaining.length && cursor) {
    let bestIdx = 0;
    let bestMiles = Infinity;
    remaining.forEach((s, i) => {
      const d = haversineMiles(cursor as { lat: number; lng: number }, s);
      if (d < bestMiles) {
        bestMiles = d;
        bestIdx = i;
      }
    });
    const [next] = remaining.splice(bestIdx, 1);
    if (!next) break;
    const miles = Math.round(bestMiles * 1.25 * 10) / 10;
    const minutes = Math.max(1, Math.round((miles / AVG_MPH) * 60));
    totalMiles += miles;
    ordered.push({ id: next.id, order: ordered.length + 1, miles, minutes });
    cursor = { lat: next.lat, lng: next.lng };
  }

  const totalMinutes = ordered.reduce((s, o) => s + o.minutes, 0);
  return {
    ordered,
    unlocated,
    totalMiles: Math.round(totalMiles * 10) / 10,
    totalMinutes,
  };
}
