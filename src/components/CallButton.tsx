import { Phone } from "lucide-react";
import { toast } from "sonner";
import { PHONE_HREF, PHONE_PLAIN, PHONE_VANITY } from "@/lib/contact-info";
import { trackContactClick } from "@/lib/contactTracking";

/**
 * Tap-to-call controls.
 *
 * These remain plain `tel:` anchors so the device—not the website—handles
 * the click and opens its native phone app directly.
 */

function track(location: string) {
  try {
    trackContactClick("call_click", location);
  } catch {
    /* never block the dial */
  }
}

/** True only on a real desktop browser, which has no dialer for `tel:`. */
function isDesktop() {
  if (typeof window === "undefined") return false;
  const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const mobileUa = /android|iphone|ipad|ipod|mobile|silk|kindle/i.test(navigator.userAgent);
  const narrow = window.innerWidth <= 820;
  return !touch && !mobileUa && !narrow;
}

export function handleCall(location: string) {
  return (e: React.MouseEvent<HTMLAnchorElement>) => {
    track(location);
    // Phones and tablets: let the OS open the dialer (never intercept).
    if (!isDesktop()) return;
    // Desktop has no dialer — a `tel:` click opens a blank tab or a handler
    // page, so copy the number and tell the visitor instead.
    e.preventDefault();
    try {
      void navigator.clipboard?.writeText(PHONE_PLAIN);
      toast.success(`Call ${PHONE_VANITY}`, { description: `${PHONE_PLAIN} copied to your clipboard.` });
    } catch {
      toast.success(`Call ${PHONE_VANITY}`, { description: PHONE_PLAIN });
    }
  };
}

/** Alias used inline on existing anchors. */
export const onCallClick = handleCall;

/**
 * Any phone link, with your own label/classes.
 * Same behavior everywhere: dialer on phones, copy + toast on desktop.
 */
export function CallLink({
  location,
  className = "",
  children,
  ...rest
}: {
  location: string;
  className?: string;
  children: React.ReactNode;
} & Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "href" | "onClick" | "children">) {
  return (
    <a
      href={PHONE_HREF}
      onClick={handleCall(location)}
      title={`Call ${PHONE_VANITY} (${PHONE_PLAIN})`}
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
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
