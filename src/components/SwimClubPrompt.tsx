import { useEffect, useId, useRef, useState } from "react";
import { X, ArrowRight } from "lucide-react";
import { CONSENT_EVENT, getConsent } from "@/lib/consent";


const DISMISS_KEY = "savvy_swim_club_prompt_dismissed";

interface SwimClubPromptProps {
  onJoin: () => void;
}

/**
 * Compact, editorial Swim Club prompt.
 * Appears once per session after the visitor engages with the page.
 */
export function SwimClubPrompt({ onJoin }: SwimClubPromptProps) {
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const titleId = useId();
  const descId = useId();

  // The cookie bar owns the bottom of the screen until the visitor answers it.
  // Showing the offer underneath it made the Join button unclickable, so we
  // wait for a consent choice (or a later re-check) before appearing.
  const [consentSettled, setConsentSettled] = useState(false);
  useEffect(() => {
    const sync = () => setConsentSettled(getConsent() !== null);
    sync();
    window.addEventListener(CONSENT_EVENT, sync);
    return () => window.removeEventListener(CONSENT_EVENT, sync);
  }, []);

  // The offer waits four minutes after the cookie choice, so it never
  // interrupts someone who just landed on the page.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!consentSettled) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    const timer = window.setTimeout(() => setVisible(true), 4 * 60 * 1000);
    return () => window.clearTimeout(timer);
  }, [consentSettled]);



  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  // Escape closes the offer from anywhere on the page, as with any dialog.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible]);

  // Tab cycles inside the offer once focus enters it, so a keyboard user can
  // always reach "Later" and the close button.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      "a[href], button:not([disabled])",
    );
    if (!focusables || focusables.length === 0) return;
    const first = focusables[0]!;
    const last = focusables[focusables.length - 1]!;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  if (!visible || !consentSettled) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onKeyDown={onKeyDown}
      className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[55] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[360px] animate-slide-in-right"
    >
      <div className="relative border border-primary/20 bg-background shadow-card">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss Swim Club offer"
          className="absolute right-1 top-1 inline-flex min-h-11 min-w-11 items-center justify-center text-primary/40 transition-colors hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-2 border-b border-primary/10 px-4 py-2.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-blip" />
          <span className="font-tech text-[10px] uppercase tracking-[0.22em] text-primary/50">
            New customer offer
          </span>
        </div>

        <div className="px-4 py-4">
          <h2 id={titleId} className="font-display uppercase leading-[0.95] tracking-tight text-primary text-[26px]">
            First service
            <span className="block text-accent">visit free.</span>
          </h2>
          <ul id={descId} className="mt-3 space-y-1.5">
            {[
              "Join the Swim Club bundle on a 12-month agreement",
              "25% off filter cleans",
              "10% off services · 10% off parts · 24/7 text support",
            ].map((item) => (
              <li key={item} className="flex gap-2 text-[13px] leading-snug text-primary/80">
                <span className="text-accent">·</span>
                {item}
              </li>
            ))}
          </ul>


          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                dismiss();
                onJoin();
              }}
              aria-label="Join Swim Club, opens the Savvy Swim checkout"
              className="font-tech inline-flex min-h-11 flex-1 items-center justify-center gap-2 bg-primary px-4 py-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent text-[11px] uppercase tracking-[0.18em] text-primary-foreground transition-colors hover:bg-accent"
            >
              Join in 60 seconds <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={dismiss}
              aria-label="Dismiss Swim Club offer"
              className="font-tech min-h-11 px-3 py-3 text-[11px] uppercase tracking-[0.18em] text-primary/45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent transition-colors hover:text-primary"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
