import { useEffect, useState } from "react";
import { Instagram } from "lucide-react";
import { INSTAGRAM_HANDLE, INSTAGRAM_URL } from "@/lib/contact-info";
import { CONSENT_EVENT, getConsent } from "@/lib/consent";

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } };
  }
}

const SCRIPT_SRC = "https://www.instagram.com/embed.js";

/**
 * Official Instagram profile card for @hi.savvyswim.
 *
 * Loads Instagram's embed script only after the visitor accepts cookies, and
 * falls back to a plain branded link when the script is blocked or declined.
 */
export default function InstagramProfileEmbed({ className = "" }: { className?: string }) {
  const [consent, setConsentState] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setConsentState(getConsent());
    const onChange = () => setConsentState(getConsent());
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (consent !== "accepted") return;
    if (window.instgrm) {
      window.instgrm.Embeds.process();
      return;
    }
    let script = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      document.body.appendChild(script);
    }
    const onLoad = () => window.instgrm?.Embeds.process();
    const onError = () => setFailed(true);
    script.addEventListener("load", onLoad);
    script.addEventListener("error", onError);
    return () => {
      script?.removeEventListener("load", onLoad);
      script?.removeEventListener("error", onError);
    };
  }, [consent]);

  const fallback = (
    <a
      href={INSTAGRAM_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 border border-hairline px-4 py-2 text-xs font-semibold uppercase tracking-wide text-foreground transition hover:text-accent"
    >
      <Instagram className="h-4 w-4" />
      Follow @{INSTAGRAM_HANDLE} on Instagram
    </a>
  );

  return (
    <div className={`w-full max-w-[326px] ${className}`}>
      {consent === "accepted" && !failed ? (
        <blockquote
          className="instagram-media"
          data-instgrm-permalink={`${INSTAGRAM_URL}?utm_source=ig_embed&utm_campaign=loading`}
          data-instgrm-version="14"
          style={{ background: "transparent", border: 0, margin: 0, padding: 0, width: "100%" }}
        >
          <a href={`${INSTAGRAM_URL}?utm_source=ig_embed&utm_campaign=loading`} target="_blank" rel="noopener noreferrer">
            View this profile on Instagram
          </a>
        </blockquote>
      ) : (
        fallback
      )}
    </div>
  );
}
