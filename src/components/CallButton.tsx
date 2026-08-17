import type { MouseEvent } from "react";
import { Phone } from "lucide-react";
import { toast } from "sonner";
import { PHONE_E164, PHONE_HREF, PHONE_PLAIN, PHONE_VANITY } from "@/lib/contact-info";
import { trackContactClick } from "@/lib/contactTracking";

/**
 * Tap-to-call controls.
 *
 * On a phone the anchor's `tel:` href opens the dialer directly. On desktop
 * (and inside the preview iframe, where `tel:` navigation is blocked) the
 * browser would otherwise sit on a blank pending tab, so we cancel the
 * navigation, copy the number and show it in a toast instead.
 */

function track(location: string) {
  try {
    trackContactClick("call_click", location);
  } catch {
    /* never block the dial */
  }
}

function canDial(): boolean {
  if (typeof window === "undefined") return true;
  // Preview / embedded iframes block tel: navigation and leave a pending tab.
  try {
    if (window.top !== window.self) return false;
  } catch {
    return false;
  }
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  const touch = navigator.maxTouchPoints > 0;
  return Boolean(coarse || touch);
}

function handleCall(location: string) {
  return (e: MouseEvent<HTMLAnchorElement>) => {
    track(location);
    if (canDial()) return; // let the dialer open
    e.preventDefault();
    try {
      void navigator.clipboard?.writeText(PHONE_E164);
    } catch {
      /* clipboard may be unavailable */
    }
    toast.success(`Call ${PHONE_VANITY}`, {
      description: `${PHONE_PLAIN} — copied to your clipboard.`,
    });
  };
}

export function CallButton({
  location,
  className = "",
}: {
  location: string;
  className?: string;
}) {
  return (
    <a
      href={PHONE_HREF}
      onClick={handleCall(location)}
      title={`Call ${PHONE_VANITY} (${PHONE_PLAIN})`}
      aria-label={`Call ${PHONE_VANITY}`}
      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-semibold text-foreground transition hover:text-primary ${className}`}
    >
      <Phone className="h-4 w-4 shrink-0 text-amber-brand" aria-hidden="true" />
      <span>{PHONE_VANITY}</span>
    </a>
  );
}

export function StickyCallBar({ location = "sticky_mobile" }: { location?: string }) {
  return (
    <>
      {/* spacer so the bar never covers page content */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-background/95 p-2 backdrop-blur md:hidden">
        <a
          href={PHONE_HREF}
          onClick={handleCall(location)}
          title={`Call ${PHONE_VANITY} (${PHONE_PLAIN})`}
          aria-label={`Call ${PHONE_VANITY}`}
          className="flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-[13px] font-bold uppercase tracking-wide text-primary-foreground"
        >
          <Phone className="h-4 w-4" aria-hidden="true" /> Call {PHONE_VANITY}
        </a>
      </div>
    </>
  );
}
