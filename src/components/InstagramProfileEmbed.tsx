import { useEffect, useRef, useState } from "react";
import { Instagram } from "lucide-react";
import { CONSENT_EVENT, getConsent, type ConsentValue } from "@/lib/consent";

const PROFILE_URL = "https://www.instagram.com/hi.savvyswim/";
const EMBED_URL = `${PROFILE_URL}?utm_source=ig_embed&utm_campaign=loading`;
const SCRIPT_SRC = "https://www.instagram.com/embed.js";

declare global {
  interface Window {
    instgrm?: { Embeds?: { process: () => void } };
  }
}

function loadEmbedScript(): Promise<void> {
  if (typeof document === "undefined") return Promise.reject(new Error("no document"));
  if (window.instgrm?.Embeds) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("instagram embed blocked")), { once: true });
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("instagram embed blocked")), { once: true });
    document.body.appendChild(script);
  });
}

/**
 * Official "View this profile on Instagram" card for @hi.savvyswim.
 * Only loads Instagram's script once the visitor has accepted cookies;
 * otherwise (or when the script is blocked) shows a plain follow button.
 */
export default function InstagramProfileEmbed({ className = "" }: { className?: string }) {
  const [consent, setConsentState] = useState<ConsentValue | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConsentState(getConsent());
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<ConsentValue | null>).detail ?? null;
      setConsentState(detail);
    };
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (consent !== "accepted") return;
    let cancelled = false;
    loadEmbedScript()
      .then(() => {
        if (cancelled) return;
        window.instgrm?.Embeds?.process();
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [consent]);

  const showEmbed = consent === "accepted" && !failed;

  return (
    <div className={className}>
      {showEmbed ? (
        <div ref={containerRef} className="mx-auto w-full max-w-[326px]">
          <blockquote
            className="instagram-media"
            data-instgrm-permalink={EMBED_URL}
            data-instgrm-version="14"
            style={{ background: "transparent", border: 0, margin: 0, padding: 0, width: "100%" }}
          >
            <a href={EMBED_URL} target="_blank" rel="noopener noreferrer">
              View this profile on Instagram
            </a>
          </blockquote>
          {!ready ? (
            <p className="mt-2 text-center text-xs text-muted-foreground">Loading Instagram…</p>
          ) : null}
        </div>
      ) : (
        <a
          href={PROFILE_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="View SAVVY SWIM on Instagram"
          className="mx-auto inline-flex items-center gap-2 border border-hairline px-4 py-2 text-xs text-muted-foreground transition hover:text-foreground"
        >
          <Instagram className="h-4 w-4" />
          <span>
            SAVVY SWIM (@hi.savvyswim) · View this profile on Instagram
          </span>
        </a>
      )}
    </div>
  );
}
