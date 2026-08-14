import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { loadMaps } from "@/lib/google-maps";
import { reverseGeocode } from "@/lib/geo.functions";


type Suggestion = { text: string; placeId: string };

/**
 * Service-area bias — centred between Plano and Frisco, covering the DFW
 * routes we actually run. Google ranks addresses inside this circle first, so
 * a homeowner sees their own street after a few characters.
 */
const SERVICE_AREA_CENTER = { lat: 33.035, lng: -96.75 };
const SERVICE_AREA_RADIUS_M = 50000; // Places API (New) maximum

interface Props {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: string;
  required?: boolean;
  maxLength?: number;
  placeholder?: string;
  className?: string;
  onChange?: (value: string) => void;
  onSelect?: (value: string, placeId: string) => void;
}

export default function AddressAutocomplete({
  id,
  name,
  value,
  defaultValue,
  required,
  maxLength = 300,
  placeholder,
  className,
  onChange,
  onSelect,
}: Props) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const text = controlled ? (value as string) : internal;

  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);
  const tokenRef = useRef<any>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const seq = useRef(0);


  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  useEffect(() => {
    if (!text || text.trim().length < 3 || !open) return;
    const q = text.trim();
    const id = ++seq.current;
    const timer = window.setTimeout(async () => {
      try {
        await loadMaps();
        const places: any = await (window as any).google.maps.importLibrary("places");
        if (!tokenRef.current) tokenRef.current = new places.AutocompleteSessionToken();
        const { suggestions } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: q,
          sessionToken: tokenRef.current,
          includedRegionCodes: ["us"],
          // Rank the homeowner's own area first (their device location when
          // shared), then our routes, then the rest of the US.
          locationBias: {
            center: coords ?? SERVICE_AREA_CENTER,
            radius: SERVICE_AREA_RADIUS_M,
          },
          origin: coords ?? SERVICE_AREA_CENTER,

        });
        if (id !== seq.current) return;
        setItems(
          (suggestions ?? [])
            .map((s: any) => ({
              text: s.placePrediction?.text?.toString?.() ?? "",
              placeId: s.placePrediction?.placeId ?? "",
            }))
            .filter((s: Suggestion) => s.text)
            .slice(0, 5),
        );
      } catch {
        setItems([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [text, open]);

  const update = (v: string) => {
    if (!controlled) setInternal(v);
    onChange?.(v);
  };

  const pick = (s: Suggestion) => {
    update(s.text);
    setItems([]);
    setOpen(false);
    tokenRef.current = null;
    onSelect?.(s.text, s.placeId);
  };

  return (
    <div ref={wrapRef} className="relative">
      <Input
        id={id}
        name={name}
        required={required}
        maxLength={maxLength}
        placeholder={placeholder}
        className={className}
        autoComplete="off"
        value={text}
        onChange={(e) => {
          update(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && items.length > 0 && (
        <ul
          className={cn(
            "absolute z-50 mt-1 w-full overflow-hidden border border-hairline bg-background shadow-lg",
          )}
        >
          {items.map((s) => (
            <li key={s.placeId || s.text}>
              <button
                type="button"
                onClick={() => pick(s)}
                className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
              >
                {s.text}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
