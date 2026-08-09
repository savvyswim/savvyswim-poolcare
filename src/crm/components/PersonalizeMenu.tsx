import { useEffect, useRef, useState } from "react";
import { Palette, Check } from "lucide-react";
import { IMG_5494_JPG, IMG_5502_PNG, IMG_5518_PNG, pool_water_hd_jpg } from "@/assets/photos";
import type { CrmPrefs } from "@/crm/lib/useCrmPrefs";

export const BACKGROUNDS: { key: string; label: string; url?: string }[] = [
  { key: "canvas", label: "Plain canvas" },
  { key: "pool", label: "Pool water", url: pool_water_hd_jpg.url },
  { key: "cabana", label: "Cabana", url: IMG_5494_JPG.url },
  { key: "deck", label: "Poolside", url: IMG_5502_PNG.url },
  { key: "riviera", label: "Riviera", url: IMG_5518_PNG.url },
];

export function backgroundUrl(key: string): string | undefined {
  return BACKGROUNDS.find((b) => b.key === key)?.url;
}

export function PersonalizeMenu({
  prefs,
  update,
}: {
  prefs: CrmPrefs;
  update: (patch: Partial<CrmPrefs>) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        className="ss-btn ss-btn-ghost"
        onClick={() => setOpen((v) => !v)}
        aria-label="Personalize workspace"
        title="Personalize workspace"
      >
        <Palette size={15} />
      </button>
      {open ? (
        <div className="ss-card absolute right-0 z-50 mt-2 w-[260px] p-3">
          <div className="ss-tag" style={{ fontSize: "0.5rem" }}>
            Background
          </div>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.key}
                title={b.label}
                aria-label={b.label}
                onClick={() => update({ background: b.key })}
                className="flex h-9 items-center justify-center rounded-[7px] border bg-cover bg-center"
                style={{
                  borderColor:
                    prefs.background === b.key ? "hsl(var(--ss-burgundy))" : "hsl(var(--ss-line))",
                  backgroundImage: b.url ? `url(${b.url})` : undefined,
                  background: b.url ? undefined : "hsl(var(--ss-canvas))",
                }}
              >
                {prefs.background === b.key ? <Check size={13} color="#fff" /> : null}
              </button>
            ))}
          </div>

          <div className="ss-tag mt-3" style={{ fontSize: "0.5rem" }}>
            Appearance
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {(["light", "dark"] as const).map((t) => (
              <button
                key={t}
                className={`ss-btn ${prefs.theme === t ? "" : "ss-btn-ghost"} flex-1`}
                onClick={() => update({ theme: t })}
              >
                {t === "light" ? "Light" : "Dark"}
              </button>
            ))}
          </div>

          <div className="ss-tag mt-3" style={{ fontSize: "0.5rem" }}>
            Density
          </div>
          <div className="mt-1.5 flex gap-1.5">
            {(["comfortable", "compact"] as const).map((d) => (
              <button
                key={d}
                className={`ss-btn ${prefs.density === d ? "" : "ss-btn-ghost"} flex-1`}
                onClick={() => update({ density: d })}
              >
                {d === "comfortable" ? "Comfortable" : "Compact"}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
