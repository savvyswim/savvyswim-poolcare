import { useEffect, useState } from "react";
import { CONSENT_EVENT, getConsent, loadLeadEmbed, setConsent } from "@/lib/consent";

/**
 * Cookie / tracking consent bar.
 *
 * The lead-capture embed is only injected once a visitor accepts. Rendered
 * after hydration so it never blocks first paint or shifts layout.
 */
export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const choice = getConsent();
    if (choice === "accepted") loadLeadEmbed();
    if (choice === null) setVisible(true);

    const onChange = () => setVisible(getConsent() === null);
    window.addEventListener(CONSENT_EVENT, onChange);
    return () => window.removeEventListener(CONSENT_EVENT, onChange);
  }, []);

  if (!visible) return null;

  const choose = (value: "accepted" | "declined") => {
    setConsent(value);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[60] border-t-2 border-accent bg-background/98 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
    >
      <div className="container-tight flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="min-w-0 text-sm leading-relaxed text-muted-foreground">
          We use cookies to run our booking tools and understand how the site is used. Decline and
          only what's needed to load the page runs.{" "}
          <a href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            Privacy policy
          </a>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => choose("declined")}
            className="min-h-[44px] flex-1 border border-hairline px-5 text-[12px] font-bold uppercase tracking-wide transition hover:border-accent sm:flex-none"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={() => choose("accepted")}
            className="btn-quote min-h-[44px] flex-1 px-6 text-[12px] font-bold uppercase tracking-wide transition sm:flex-none"
          >
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}
