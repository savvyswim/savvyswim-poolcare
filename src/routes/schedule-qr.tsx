/**
 * /schedule-qr — internal marketing helper. Generates a printable QR code that
 * points at /schedule with a campaign tag, so every flyer, yard sign, door
 * hanger or truck decal reports its own lead source.
 */
import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Link } from "@/lib/router-compat";
import { SITE_URL } from "@/lib/structured-data";

export const Route = createFileRoute("/schedule-qr")({
  head: () => ({
    meta: [
      { title: "Inspection QR code generator | Savvy Swim" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Internal tool for printing tagged inspection QR codes." },
    ],
  }),
  component: ScheduleQrPage,
});

const PRESETS = ["flyer", "yard_sign", "truck", "door_hanger", "postcard", "event"];

function ScheduleQrPage() {
  const [tag, setTag] = useState("flyer");
  const [png, setPng] = useState<string | null>(null);

  const slug = useMemo(() => tag.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 40), [tag]);
  // Full UTM set so print scans show up beside digital campaigns in reporting.
  const url = slug
    ? `${SITE_URL}/schedule?src=${slug}&utm_source=print&utm_medium=qr&utm_campaign=${slug}`
    : `${SITE_URL}/schedule`;

  useEffect(() => {
    let alive = true;
    void (async () => {
      const QRCode = (await import("qrcode")).default;
      const data = await QRCode.toDataURL(url, {
        width: 1024,
        margin: 2,
        errorCorrectionLevel: "H",
        color: { dark: "#8E1F2C", light: "#F4EFE3" },
      });
      if (alive) setPng(data);
    })();
    return () => {
      alive = false;
    };
  }, [url]);

  return (
    <div className="min-h-screen">
      <header className="border-b border-hairline">
        <div className="container-tight flex h-[70px] items-center justify-between">
          <Link to="/" className="font-display text-[1.4rem] uppercase tracking-tight text-accent">
            Savvy Swim
          </Link>
          <span className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Internal · QR generator
          </span>
        </div>
      </header>

      <main className="container-tight grid grid-cols-1 gap-10 py-12 lg:grid-cols-2">
        <div>
          <h1 className="font-display text-3xl uppercase tracking-tight">Inspection QR code</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Every scan lands on the inspection scheduling page and the lead is tagged with the
            campaign code below, so you can tell which piece of marketing produced it.
          </p>

          <label className="mt-8 block font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
            Campaign code
          </label>
          <input
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            className="mt-2 w-full border border-hairline bg-background px-3 py-2 font-tech text-sm"
            placeholder="flyer"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setTag(p)}
                className="border border-hairline px-3 py-1 font-tech text-[11px] uppercase tracking-[0.14em] hover:border-accent hover:text-accent"
              >
                {p}
              </button>
            ))}
          </div>

          <div className="mt-8 border-t border-hairline pt-5">
            <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Link
            </div>
            <p className="mt-2 break-all font-tech text-sm">{url}</p>
            <button
              type="button"
              onClick={() => void navigator.clipboard?.writeText(url)}
              className="mt-3 border border-hairline px-4 py-2 font-tech text-[11px] uppercase tracking-[0.14em] hover:border-accent hover:text-accent"
            >
              Copy link
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-start">
          <div className="border border-hairline bg-secondary/20 p-6">
            {png ? (
              <img src={png} alt={`QR code linking to ${url}`} className="h-64 w-64" />
            ) : (
              <div className="h-64 w-64 animate-pulse bg-secondary/40" />
            )}
          </div>
          {png ? (
            <a
              href={png}
              download={`savvy-swim-inspection-${slug || "schedule"}.png`}
              className="mt-5 border border-accent px-5 py-2 font-tech text-[11px] uppercase tracking-[0.14em] text-accent"
            >
              Download PNG
            </a>
          ) : null}
          <p className="mt-4 max-w-xs text-center text-xs text-muted-foreground">
            Print at 1 inch minimum. High error correction, so it still scans with a logo sticker
            over a corner.
          </p>
        </div>
      </main>
    </div>
  );
}
