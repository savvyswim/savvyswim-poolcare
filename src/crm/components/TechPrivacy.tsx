import { useEffect, useState } from "react";

/**
 * Technician privacy shield — full-screen diagonal watermark with the tech's
 * initials + a live timestamp (refreshed every 60s), plus content blur when the
 * window loses focus. Text selection / context menu are disabled by the caller.
 */
export function TechWatermark({ initials }: { initials: string }) {
  const [stamp, setStamp] = useState(() => new Date().toLocaleString());

  useEffect(() => {
    const t = setInterval(() => setStamp(new Date().toLocaleString()), 60_000);
    return () => clearInterval(t);
  }, []);

  const cell = `${initials} · ${stamp}`;
  const rows = Array.from({ length: 14 }, () => Array.from({ length: 4 }, () => cell).join("     "));

  return (
    <div className="ss-watermark" aria-hidden="true">
      <span>{rows.join("\n")}</span>
    </div>
  );
}

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

export function PrivacyNotice() {
  return (
    <div className="ss-privacy-notice fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="ss-hero max-w-xs p-5 text-center">
        <div className="ss-tag" style={{ color: "rgba(255,255,255,.7)", fontSize: "0.55rem" }}>
          Content protected
        </div>
        <p className="mt-2 text-[0.9rem] leading-snug">
          Customer information is hidden while this window is not in focus.
        </p>
      </div>
    </div>
  );
}
