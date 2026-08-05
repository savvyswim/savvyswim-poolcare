import { useEffect, useState } from "react";
import { X, ArrowRight } from "lucide-react";

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

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    let shown = false;
    const show = () => {
      if (shown) return;
      shown = true;
      setVisible(true);
      window.removeEventListener("scroll", onScroll);
    };
    const onScroll = () => {
      if (window.scrollY > window.innerHeight * 0.6) show();
    };

    const timer = window.setTimeout(show, 9000);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Savvy Swim Club"
      className="fixed inset-x-3 bottom-3 z-[60] sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[360px] animate-slide-in-right"
    >
      <div className="relative border border-primary/20 bg-background shadow-card">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss Swim Club offer"
          className="absolute right-2 top-2 p-1.5 text-primary/40 transition-colors hover:text-primary"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 border-b border-primary/10 px-4 py-2.5">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent animate-blip" />
          <span className="font-tech text-[10px] uppercase tracking-[0.22em] text-primary/50">
            Summer offer — new customers
          </span>
        </div>

        <div className="px-4 py-4">
          <p className="font-display uppercase leading-[0.95] tracking-tight text-primary text-[26px]">
            First service
            <span className="block text-accent">visit free.</span>
          </p>
          <ul className="mt-3 space-y-1.5">
            {[
              "Join the Swim Club bundle on a 12-month agreement",
              "50% off your first filter clean",
              "5% off parts · 7% off labor · 24/7 text support",
            ].map((item) => (
              <li key={item} className="flex gap-2 text-[13px] leading-snug text-primary/80">
                <span className="text-accent">—</span>
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
              className="font-tech inline-flex flex-1 items-center justify-center gap-2 bg-primary px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-primary-foreground transition-colors hover:bg-accent"
            >
              Join in 60 seconds <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="font-tech px-3 py-3 text-[11px] uppercase tracking-[0.18em] text-primary/45 transition-colors hover:text-primary"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
