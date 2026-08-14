import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { addressMapPreview } from "@/lib/geo.functions";

interface Props {
  /** Google place ID from the address autocomplete selection. */
  placeId?: string;
  /** Fallback label shown under the map. */
  address?: string;
  className?: string;
}

/**
 * Static map rendered server-side through the Maps connector gateway, so it
 * works on savvyswim.com and savvyswimservices.com as well as preview — the
 * browser Maps key is locked to the preview domains.
 */
export default function AddressMapPreview({ placeId, address, className }: Props) {
  const [image, setImage] = useState<string | null>(null);
  const [label, setLabel] = useState<string>(address ?? "");

  useEffect(() => {
    if (!placeId && !address) {
      setImage(null);
      return;
    }
    let cancelled = false;
    setImage(null);

    (async () => {
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
          setLabel(res.address || address || "");
        } else {
          setImage(null);
        }
      } catch {
        // Map is a convenience — hide it rather than leaving a dead grey box.
        if (!cancelled) setImage(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [placeId, address]);

  if (!image) return null;

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
