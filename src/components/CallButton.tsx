import { Phone } from "lucide-react";
import { PHONE_HREF, PHONE_VANITY } from "@/lib/contact-info";
import { trackContactClick } from "@/lib/contactTracking";

/**
 * Tap-to-call controls. Always a real anchor with a `tel:` href so the device
 * dialer opens with the number pre-filled — never a button + JS handler.
 * Analytics tracking is fire-and-forget and never blocks navigation.
 */

function track(location: string) {
  try {
    trackContactClick("call_click", location);
  } catch {
    /* never block the dial */
  }
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
      onClick={() => track(location)}
      title={`Call ${PHONE_VANITY}`}
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
          onClick={() => track(location)}
          title={`Call ${PHONE_VANITY}`}
          aria-label={`Call ${PHONE_VANITY}`}
          className="flex w-full items-center justify-center gap-2 bg-primary px-4 py-3 text-[13px] font-bold uppercase tracking-wide text-primary-foreground"
        >
          <Phone className="h-4 w-4" aria-hidden="true" /> Call {PHONE_VANITY}
        </a>
      </div>
    </>
  );
}
