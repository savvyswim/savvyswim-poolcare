import { useEffect, useRef, useState } from "react";
import { loadMaps } from "@/lib/google-maps";
import { cn } from "@/lib/utils";

interface Props {
  /** Google place ID from the address autocomplete selection. */
  placeId?: string;
  /** Fallback label shown under the map. */
  address?: string;
  className?: string;
}

export default function AddressMapPreview({ placeId, address, className }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!placeId) return;
    setError(null);
    let cancelled = false;

    (async () => {
      try {
        await loadMaps();
        const g = (window as any).google;
        const { Place } = await g.maps.importLibrary("places");
        const place = new Place({ id: placeId });
        await place.fetchFields({ fields: ["location", "formattedAddress"] });
        if (cancelled || !divRef.current || !place.location) return;

        const center = place.location;
        if (!mapRef.current) {
          mapRef.current = new g.maps.Map(divRef.current, {
            center,
            zoom: 17,
            disableDefaultUI: true,
            zoomControl: true,
            gestureHandling: "cooperative",
          });
          markerRef.current = new g.maps.Marker({ map: mapRef.current, position: center });
        } else {
          mapRef.current.setCenter(center);
          mapRef.current.setZoom(17);
          markerRef.current?.setPosition(center);
        }
        setError(null);
      } catch {
        // Key blocked on this domain, offline, or Places failed — hide the map
        // entirely rather than leaving a dead grey box in the form.
        if (!cancelled) setError("unavailable");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [placeId]);

  if (!placeId || error) return null;

  return (
    <div className="mt-3">
      <div
        ref={divRef}
        aria-label={address ? `Map of ${address}` : "Map of selected address"}
        className={cn("h-48 w-full border border-hairline bg-muted", className)}
      />
      {address ? <p className="mt-1.5 text-xs text-muted-foreground">{address}</p> : null}
    </div>
  );

}
