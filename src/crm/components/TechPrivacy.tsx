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
