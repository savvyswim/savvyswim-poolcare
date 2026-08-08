import { useEffect, useState } from "react";

/** Returns true when the window is blurred / tab hidden. */
export function useWindowObscured() {
  const [obscured, setObscured] = useState(false);
  useEffect(() => {
    const hide = () => setObscured(true);
    const show = () => setObscured(false);
    const vis = () => setObscured(document.visibilityState === "hidden");
    window.addEventListener("blur", hide);
    window.addEventListener("focus", show);
    document.addEventListener("visibilitychange", vis);
    return () => {
      window.removeEventListener("blur", hide);
      window.removeEventListener("focus", show);
      document.removeEventListener("visibilitychange", vis);
    };
  }, []);
  return obscured;
}

/**
 * Blocks the easy ways to take customer data off a technician device:
 * copy / cut / drag of page content, save-page and print shortcuts, and the
 * print dialog itself. Also masks the screen while the print snapshot is
 * taken. Returns true while a capture attempt is being blocked, so the UI can
 * show the shield overlay.
 */
export function useCaptureGuard(active: boolean) {
  const [masked, setMasked] = useState(false);

  useEffect(() => {
    if (!active) return;

    const stop = (e: Event) => {
      e.preventDefault();
      setMasked(true);
      window.setTimeout(() => setMasked(false), 1200);
    };

    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      const meta = e.ctrlKey || e.metaKey;
      // print, save-page, and the PrintScreen key
      if ((meta && (k === "p" || k === "s")) || k === "printscreen") stop(e);
      // macOS screenshot shortcuts (Cmd+Shift+3/4/5) — best effort
      if (e.metaKey && e.shiftKey && ["3", "4", "5"].includes(k)) stop(e);
    };

    const mask = () => setMasked(true);
    const unmask = () => setMasked(false);

    document.addEventListener("copy", stop);
    document.addEventListener("cut", stop);
    document.addEventListener("dragstart", stop);
    document.addEventListener("keydown", onKey, true);
    window.addEventListener("beforeprint", mask);
    window.addEventListener("afterprint", unmask);
    return () => {
      document.removeEventListener("copy", stop);
      document.removeEventListener("cut", stop);
      document.removeEventListener("dragstart", stop);
      document.removeEventListener("keydown", onKey, true);
      window.removeEventListener("beforeprint", mask);
      window.removeEventListener("afterprint", unmask);
    };
  }, [active]);

  return masked;
}

export function PrivacyNotice({
  message = "Customer information is hidden while this window is not in focus.",
}: {
  message?: string;
}) {
  return (
    <div className="ss-privacy-notice fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="ss-hero max-w-xs p-5 text-center">
        <div className="ss-tag" style={{ color: "rgba(255,255,255,.7)", fontSize: "0.55rem" }}>
          Content protected
        </div>
        <p className="mt-2 text-[0.9rem] leading-snug">{message}</p>
      </div>
    </div>
  );
}

/**
 * Diagonal identity watermark. It cannot stop a phone camera, but every
 * screenshot then carries the account and timestamp that took it.
 */
export function PrivacyWatermark({ label }: { label: string }) {
  const stamp = new Date().toLocaleDateString("en-US");
  const text = `${label} · ${stamp} · confidential`;
  return (
    <div className="ss-privacy-watermark" aria-hidden="true">
      {Array.from({ length: 14 }, (_, i) => (
        <span key={i}>{text}</span>
      ))}
    </div>
  );
}
