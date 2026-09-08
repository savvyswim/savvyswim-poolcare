import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { isMapsAuthBlocked, loadMaps, onMapsAuthBlocked } from "@/lib/google-maps";
import { trackSiteEvent } from "@/lib/site-analytics";
import { addressMapPreview } from "@/lib/geo.functions";

interface Props {
  /** Google place ID from the address autocomplete selection. */
  placeId?: string;
  /** Fallback label shown under the map. */
  address?: string;
  className?: string | undefined;
}

/**
 * Map preview with three layers, so something useful shows on every domain:
 *  1. Static map rendered server-side through the connector gateway (works on
 *     savvyswim.com and savvyswimservices.com. no browser key involved).
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
  const [blocked, setBlocked] = useState(false);
  // True once the map attempts have finished, so we don't count the brief
  // pre-load render as a fallback.
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const off = onMapsAuthBlocked(() => setBlocked(true));
    return () => {
      off();
    };
  }, []);


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
    setSettled(false);

    (async () => {
      // 1, server-rendered static map (domain-independent). This is the
      // primary map on savvyswim.com / savvyswimservices.com, where Google
      // blocks the shared browser key.
      const staticAttempts: Array<Record<string, unknown>> = [];
      if (placeId) staticAttempts.push({ placeId, ...(address ? { address } : {}) });
      if (address) staticAttempts.push({ address }); // retry without the place id
      if (!staticAttempts.length && address) staticAttempts.push({ address });

      for (const attempt of staticAttempts) {
        try {
          const res = await addressMapPreview({
            data: { ...attempt, width: 640, height: 320, zoom: 17 },
          });
          if (cancelled) return;
          if (res?.image) {
            setImage(res.image);
            if (res.address) setLabel(res.address);
            setSettled(true);
            return;
          }
        } catch {
          /* try the next attempt, then the interactive map */
        }
        if (cancelled) return;
      }



      // 2, interactive map, only possible where the browser key is allowed
      if (!placeId || isMapsAuthBlocked()) {
        if (!cancelled) {
          if (isMapsAuthBlocked()) setBlocked(true);
          setSettled(true);
        }
        return;
      }
      try {
        await loadMaps();
        const g = (window as any).google;
        const { Place } = await g.maps.importLibrary("places");
        const place = new Place({ id: placeId });
        await place.fetchFields({ fields: ["location", "formattedAddress"] });
        if (cancelled) return;
        if (!place.location) {
          setSettled(true);
          return;
        }
        setSettled(true);
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
        if (!cancelled) {
          setInteractive(false);
          if (isMapsAuthBlocked()) setBlocked(true);
          setSettled(true);
        }
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
          onError={() => setImage(null)}
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

  return <FallbackCard label={label} blocked={blocked} settled={settled} className={className} />;
}

/** Text-only confirmation shown when no map can render on this domain. */
function FallbackCard({
  label,
  blocked,
  settled,
  className,
}: {
  label: string;
  blocked: boolean;
  settled: boolean;
  className?: string | undefined;
}) {
  useEffect(() => {
    if (!settled) return;
    trackSiteEvent("maps_fallback_shown", blocked ? "referrer_blocked" : "no_map");
  }, [settled, blocked]);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;

  return (
    <div className={cn("mt-3 border border-hairline bg-background/60", className)}>
      <div className="flex items-start gap-3 px-3 py-2.5">
        <span
          aria-hidden="true"
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center border border-hairline bg-[#1FA9BE]/10 text-[#1FA9BE]"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
            <path d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-[#1FA9BE]">
            Address confirmed
          </p>
          <p className="mt-1 break-words text-sm text-foreground">{label}</p>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-1.5 inline-block text-xs font-semibold uppercase tracking-[0.12em] text-[#8E1F2C] underline underline-offset-4"
          >
            Open in Google Maps
          </a>
          {blocked ? (
            <p className="mt-1.5 text-[0.68rem] leading-snug text-muted-foreground">
              Map preview is unavailable on this domain. Your address is saved exactly as shown.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
