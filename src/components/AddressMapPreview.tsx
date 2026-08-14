import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { loadMaps } from "@/lib/google-maps";
import { addressMapPreview } from "@/lib/geo.functions";

interface Props {
  /** Google place ID from the address autocomplete selection. */
  placeId?: string;
  /** Fallback label shown under the map. */
  address?: string;
  className?: string;
}

/**
 * Map preview with three layers, so something useful shows on every domain:
 *  1. Static map rendered server-side through the connector gateway (works on
 *     savvyswim.com and savvyswimservices.com — no browser key involved).
 *  2. Interactive Google map, when the browser key is allowed on this domain.
 *  3. A plain confirmation card with an "Open in Google Maps" link.
 */
export default function AddressMapPreview({ placeId, address, className }: Props) {
  const divRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const [image, setImage] = useState<string | null>(null);
  const [interactive, setInteractive] = useState(false);
  const [label, setLabel] = useState<string>(address ?? "");

  useEffect(() => {
    setLabel(address ?? "");
  }, [address]);

  useEffect(() => {
    if (!placeId && !address) {
      setImage(null);
      setInteractive(false);
      return;
    }
    let cancelled = false;
    setImage(null);
    setInteractive(false);

    (async () => {
      // 1 — server-rendered static map (domain-independent)
      try {
        const res = await addressMapPreview({
          data: {
            ...(placeId ? { placeId } : {}),
            ...(address ? { address } : {}),
            width: 640,
            height: 320,
            zoom: 17,
          },
        });
        if (cancelled) return;
        if (res?.image) {
          setImage(res.image);
          if (res.address) setLabel(res.address);
          return;
        }
      } catch {
        /* fall through to the interactive map */
      }

      // 2 — interactive map, only possible where the browser key is allowed
      if (!placeId) return;
      try {
        await loadMaps();
        const g = (window as any).google;
        const { Place } = await g.maps.importLibrary("places");
        const place = new Place({ id: placeId });
        await place.fetchFields({ fields: ["location", "formattedAddress"] });
        if (cancelled || !place.location) return;
        setInteractive(true);
        // Wait a tick so the map container is in the DOM before Google draws.
        requestAnimationFrame(() => {
          if (cancelled || !divRef.current) return;
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
            markerRef.current?.setPosition(center);
          }
        });
      } catch {
        if (!cancelled) setInteractive(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [placeId, address]);

  if (!placeId && !address) return null;

  if (image) {
    return (
      <div className="mt-3">
        <img
          src={image}
          alt={label ? `Map of ${label}` : "Map of the selected address"}
          loading="lazy"
          className={cn("h-48 w-full border border-hairline object-cover", className)}
        />
        {label ? <p className="mt-1.5 text-xs text-muted-foreground">{label}</p> : null}
      </div>
    );
  }

  if (interactive) {
    return (
      <div className="mt-3">
        <div
          ref={divRef}
          aria-label={label ? `Map of ${label}` : "Map of selected address"}
          className={cn("h-48 w-full border border-hairline bg-muted", className)}
        />
        {label ? <p className="mt-1.5 text-xs text-muted-foreground">{label}</p> : null}
      </div>
    );
  }

  if (!label) return null;

  return (
    <div className="mt-3 border border-hairline bg-background/60 px-3 py-2.5">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#1FA9BE]">
        Address confirmed
      </p>
      <p className="mt-1 text-sm text-foreground">{label}</p>
      <a
        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-block text-xs font-semibold uppercase tracking-[0.12em] text-[#8E1F2C] underline underline-offset-4"
      >
        Open in Google Maps
      </a>
    </div>
  );
}
