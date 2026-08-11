import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CONSENT_EVENT, getConsent, setConsent } from "@/lib/consent";
import { trackSiteEvent } from "@/lib/site-analytics";

/**
 * Cookie / tracking consent bar.
 *
 * Lead capture happens on this site, so nothing third-party is injected here.
 * Rendered after hydration so it never blocks first paint or shifts layout.
 *
 * Accessibility notes:
 * - Non-modal dialog: it never traps focus on first load (that would hijack a
 *   reader mid-sentence), but Tab cycles inside it once the visitor moves focus
 *   in, so a keyboard user can always reach both choices.
 * - Reopening from "Cookie settings" moves focus into the bar; making a choice
 *   (or pressing Escape) returns focus to wherever it came from.
 */
export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);
  const seen = useRef(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const acceptRef = useRef<HTMLButtonElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    const choice = getConsent();
    if (choice === null) setVisible(true);



    const onChange = () => {
      const reopened = getConsent() === null;
      if (reopened) {
        // Remember the control that reopened the bar so focus can go back.
        returnFocusRef.current =
          document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }
      setVisible(reopened);
      if (reopened) trackSiteEvent("banner_reopened");
    };
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  useEffect(() => {
    if (visible && !seen.current) {
      seen.current = true;
      trackSiteEvent("banner_shown");
    }
    // Only pull focus when the visitor asked for the bar back.
    if (visible && returnFocusRef.current) acceptRef.current?.focus();
  }, [visible]);

  const close = useCallback(() => {
    setVisible(false);
    const back = returnFocusRef.current;
    returnFocusRef.current = null;
    // Restore focus after the bar unmounts so the browser doesn't reset to body.
    if (back && document.contains(back)) requestAnimationFrame(() => back.focus());
  }, []);

  const choose = useCallback(
    (value: "accepted" | "declined") => {
      trackSiteEvent(value === "accepted" ? "banner_accepted" : "banner_declined");
      setConsent(value);

      close();
    },
    [close],
  );


  // Escape dismisses the bar without recording a choice; Tab cycles within it.
  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusables = panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled])',
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

  if (!visible) return null;

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-labelledby={titleId}
      aria-describedby={descId}
      onKeyDown={onKeyDown}
      className="fixed inset-x-0 bottom-0 z-[60] border-t-2 border-accent bg-background/98 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
    >
      <div className="container-tight flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <h2 id={titleId} className="sr-only">
            Cookie and tracking consent
          </h2>
          <p id={descId} className="text-sm leading-relaxed text-muted-foreground">
            We use cookies to run our booking tools and understand how the site is used. Decline and
            only what&apos;s needed to load the page runs.{" "}
            <a
              href="/privacy"
              className="underline underline-offset-2 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              Privacy policy
            </a>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("declined")}
            aria-label="Decline cookies and tracking"
            className="min-h-[44px] flex-1 border border-hairline px-5 text-[12px] font-bold uppercase tracking-wide transition hover:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-none"
          >
            Decline
          </button>
          <button
            ref={acceptRef}
            type="button"
            onClick={() => choose("accepted")}
            aria-label="Accept cookies and tracking"
            className="btn-quote min-h-[44px] flex-1 px-6 text-[12px] font-bold uppercase tracking-wide transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:flex-none"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
