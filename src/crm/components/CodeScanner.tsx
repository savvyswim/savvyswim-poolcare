import { useEffect, useRef, useState } from "react";
import { Camera, ScanLine, X } from "lucide-react";

type Detected = { rawValue: string };

/**
 * Scans a product QR/bar code with the device camera when the browser exposes
 * the native BarcodeDetector API, and always offers a keyboard fallback so a
 * USB scanner gun or manual SKU entry works everywhere.
 */
export default function CodeScanner({
  onScan,
  label = "Scan code",
}: {
  onScan: (code: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [manual, setManual] = useState("");
  const [camError, setCamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (!open) return;
    let stopped = false;
    let raf = 0;

    void (async () => {
      const Detector = (window as unknown as { BarcodeDetector?: new (o?: unknown) => { detect: (s: CanvasImageSource) => Promise<Detected[]> } })
        .BarcodeDetector;
      if (!Detector || !navigator.mediaDevices?.getUserMedia) {
        setCamError("Camera scanning is not supported here — type or scan the code below.");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const detector = new Detector({ formats: ["qr_code", "code_128", "ean_13", "upc_a", "code_39"] });
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const hits = await detector.detect(videoRef.current);
            const code = hits[0]?.rawValue?.trim();
            if (code) {
              onScan(code);
              setOpen(false);
              return;
            }
          } catch {
            /* frame not ready */
          }
          raf = requestAnimationFrame(() => void tick());
        };
        raf = requestAnimationFrame(() => void tick());
      } catch {
        setCamError("Camera blocked — type or scan the code below.");
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [open, onScan]);

  return (
    <>
      <button type="button" className="ss-btn ss-btn-ghost flex items-center gap-1" onClick={() => { setCamError(null); setOpen(true); }}>
        <ScanLine size={13} /> {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="savvy-crm relative w-full max-w-sm p-4" style={{ background: "hsl(var(--ss-cream))" }}>
            <div className="flex items-center justify-between">
              <span className="ss-tag flex items-center gap-1"><Camera size={12} /> Scan product</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close scanner"><X size={16} /></button>
            </div>

            {camError ? (
              <p className="mt-3 text-[0.78rem] opacity-70">{camError}</p>
            ) : (
              <video ref={videoRef} playsInline muted className="mt-3 w-full bg-black" style={{ aspectRatio: "4 / 3" }} />
            )}

            <form
              className="mt-3 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const code = manual.trim();
                if (!code) return;
                onScan(code);
                setManual("");
                setOpen(false);
              }}
            >
              {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
              <input
                autoFocus
                className="ss-input flex-1"
                placeholder="SKU or barcode"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
              <button className="ss-btn" type="submit">Use</button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
