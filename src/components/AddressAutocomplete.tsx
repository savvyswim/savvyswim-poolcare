import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";

import { reverseGeocode, suggestAddresses } from "@/lib/geo.functions";


type Suggestion = { text: string; placeId: string };

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
  const tokenRef = useRef<string | null>(null);
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
        if (!tokenRef.current) {
          tokenRef.current =
            typeof crypto !== "undefined" && "randomUUID" in crypto
              ? crypto.randomUUID()
              : String(Date.now());
        }
        // Suggestions come back through the server so they work on every
        // domain, not just the referrer-allowed preview hosts.
        const suggestions = await suggestAddresses({
          data: {
            input: q,
            sessionToken: tokenRef.current,
            ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
          },
        });
        if (id !== seq.current) return;
        setItems(suggestions);
      } catch {
        setItems([]);
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [text, open, coords]);


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

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocError("Location isn't available on this device — type your address instead.");
      return;
    }
    setLocError(null);
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCoords(next);
        try {
          const res = await reverseGeocode({ data: next });
          if (res.formattedAddress) {
            update(res.formattedAddress);
            setItems([]);
            setOpen(false);
            tokenRef.current = null;
            onSelect?.(res.formattedAddress, res.placeId);
          } else {
            setLocError("Couldn't read an address there — type it in instead.");
          }
        } catch {
          setLocError("Couldn't read an address there — type it in instead.");
        } finally {
          setLocating(false);
        }
      },
      () => {
        setLocating(false);
        setLocError("Location off — type your address instead.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  };

  return (
    <div ref={wrapRef}>
      <div className="relative">
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
          <ul className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden border border-hairline bg-background shadow-lg">
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


      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 rounded-none text-xs font-semibold uppercase tracking-[0.12em] text-[#1FA9BE] disabled:opacity-60"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 21s7-5.686 7-11a7 7 0 1 0-14 0c0 5.314 7 11 7 11Z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
          {locating ? "Locating…" : "Use my current location"}
        </button>
        {locError ? (
          <span role="status" className="text-xs text-muted-foreground">
            {locError}
          </span>
        ) : null}
      </div>
    </div>

  );
}
