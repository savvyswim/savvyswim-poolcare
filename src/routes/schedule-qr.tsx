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

const QR_OPTS = {
  width: 1024,
  margin: 2,
  errorCorrectionLevel: "H" as const,
  color: { dark: "#8E1F2C", light: "#F4EFE3" },
};

const toSlug = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").slice(0, 40);

/** Full UTM set so print scans show up beside digital campaigns in reporting. */
const campaignUrl = (slug: string) =>
  slug
    ? `${SITE_URL}/schedule?src=${slug}&utm_source=print&utm_medium=qr&utm_campaign=${slug}`
    : `${SITE_URL}/schedule`;

function ScheduleQrPage() {
  const [tag, setTag] = useState("flyer");
  const [png, setPng] = useState<string | null>(null);
  const [batchText, setBatchText] = useState(PRESETS.join("\n"));
  const [zipping, setZipping] = useState(false);
  const [zipNote, setZipNote] = useState<string | null>(null);

  const slug = useMemo(() => toSlug(tag), [tag]);
  const url = campaignUrl(slug);

  const batchSlugs = useMemo(
    () => Array.from(new Set(batchText.split(/[\n,]+/).map(toSlug).filter(Boolean))),
    [batchText],
  );

  const downloadZip = async () => {
    if (!batchSlugs.length || zipping) return;
    setZipping(true);
    setZipNote(null);
    try {
      const [{ default: QRCode }, { zipSync, strToU8 }] = await Promise.all([
        import("qrcode"),
        import("fflate"),
      ]);
      const files: Record<string, Uint8Array> = {};
      const rows = ["campaign_code,url,file"];
      for (const s of batchSlugs) {
        const link = campaignUrl(s);
        const dataUrl: string = await QRCode.toDataURL(link, QR_OPTS);
        const bin = atob(dataUrl.split(",")[1] ?? "");
        const bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        const name = `savvy-swim-inspection-${s}.png`;
        files[name] = bytes;
        rows.push(`${s},"${link}",${name}`);
      }
      files["campaign-links.csv"] = strToU8(rows.join("\n"));
      const zipped = zipSync(files, { level: 6 });
      const blob = new Blob([zipped.slice().buffer as ArrayBuffer], { type: "application/zip" });
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `savvy-swim-qr-codes-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(href);
      setZipNote(`Downloaded ${batchSlugs.length} QR codes + campaign-links.csv`);
    } catch {
      setZipNote("Could not build the zip. Try again.");
    } finally {
      setZipping(false);
    }
  };


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

          <div className="mt-8 border-t border-hairline pt-5">
            <div className="font-tech text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
              Batch · multiple campaign codes
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              One code per line (or comma separated). Downloads a zip with a print-ready PNG for
              each code plus a CSV of the tagged links.
            </p>
            <textarea
              value={batchText}
              onChange={(e) => setBatchText(e.target.value)}
              rows={6}
              className="mt-3 w-full border border-hairline bg-background px-3 py-2 font-tech text-sm"
              placeholder={"flyer\nyard_sign\ntruck"}
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void downloadZip()}
                disabled={zipping || batchSlugs.length === 0}
                className="border border-accent px-5 py-2 font-tech text-[11px] uppercase tracking-[0.14em] text-accent disabled:opacity-40"
              >
                {zipping ? "Building zip…" : `Download ${batchSlugs.length} QR codes (.zip)`}
              </button>
              {zipNote ? (
                <span className="font-tech text-[11px] text-muted-foreground">{zipNote}</span>
              ) : null}
            </div>
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
