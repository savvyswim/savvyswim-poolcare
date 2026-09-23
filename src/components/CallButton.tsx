import { useEffect, useRef, useState } from "react";
import { Phone, MessageSquare, Copy, Check, CalendarClock, Video, Globe } from "lucide-react";
import { PHONE_E164, PHONE_HREF, PHONE_PLAIN, PHONE_VANITY } from "@/lib/contact-info";
import { trackContactClick } from "@/lib/contactTracking";

/**
 * Tap-to-call controls.
 *
 * Phones and tablets: plain `tel:` anchors, so the device opens its dialer.
 * Desktop browsers: we open a small call card instead of leaving the visitor
 * on a blank tab. It still offers a real `tel:` "Call now" (Macs/iPads hand
 * off to FaceTime/iPhone), a text link, a callback request, and the number
 * itself in plain sight.
 */

const SMS_HREF = `sms:${PHONE_E164}`;
const CALL_CARD_EVENT = "ss:open-call-card";

function track(location: string) {
  try {
    trackContactClick("call_click", location);
  } catch {
    /* never block the dial */
  }
}

/**
 * True only on a real desktop browser, which may have no dialer for `tel:`.
 * Decided by device capability. Never by window width, so a narrow desktop
 * window or preview panel still gets the call card.
 */
function isDesktop() {
  if (typeof window === "undefined") return false;
  const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const mobileUa = /android|iphone|ipad|ipod|mobile|silk|kindle/i.test(navigator.userAgent);
  const coarse = typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
  return !touch && !mobileUa && !coarse;
}


type CardDetail = { location: string; x: number; y: number };

export function handleCall(location: string) {
  return (e: React.MouseEvent<HTMLAnchorElement>) => {
    track(location);
    // Phones and tablets: let the OS open the dialer (never intercept).
    if (!isDesktop()) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    try {
      window.dispatchEvent(
        new CustomEvent<CardDetail>(CALL_CARD_EVENT, {
          detail: { location, x: rect.left + rect.width / 2, y: rect.bottom },
        }),
      );
      e.preventDefault();
    } catch {
      /* card unavailable, let the plain tel: link run so it's never a dead click */
    }
  };
}


/** Alias used inline on existing anchors. */
export const onCallClick = handleCall;

/**
 * Single global card, mounted once in the root layout.
 * Opens next to whichever phone control the visitor clicked.
 */
export function CallOptionsCard() {
  const [state, setState] = useState<CardDetail | null>(null);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onOpen = (e: Event) => {
      setCopied(false);
      setState((e as CustomEvent<CardDetail>).detail);
    };
    window.addEventListener(CALL_CARD_EVENT, onOpen as EventListener);
    return () => window.removeEventListener(CALL_CARD_EVENT, onOpen as EventListener);
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setState(null);
    };
    const onDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) setState(null);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [state]);

  if (!state) return null;

  const sub = (action: string) => {
    try {
      trackContactClick(action === "sms_click" ? "text_click" : "call_click", `${state.location}:${action}`);
    } catch {
      /* non-blocking */
    }
  };

  const width = Math.min(288, window.innerWidth - 24);
  const left = Math.min(Math.max(state.x - width / 2, 12), Math.max(window.innerWidth - width - 12, 12));
  const top = Math.max(Math.min(state.y + 10, window.innerHeight - 430), 12);


  const rowClass =
    "inline-flex w-full items-center gap-3 whitespace-nowrap border border-hairline bg-background px-4 py-3 text-[12px] font-bold uppercase tracking-wide text-primary transition hover:bg-primary hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`Call ${PHONE_VANITY}`}
      style={{ position: "fixed", left, top, width }}
      className="z-[130] border border-hairline bg-card p-4 shadow-card"
    >
      <p className="font-tech text-[10px] uppercase tracking-[0.3em] text-accent">Call Savvy Swim</p>
      <p className="mt-1 select-all font-display text-2xl uppercase leading-none text-primary">
        {PHONE_VANITY}
      </p>
      <p className="select-all text-[13px] text-foreground/70">{PHONE_PLAIN}</p>


      <div className="mt-4 flex flex-col gap-2">
        <a
          href={PHONE_HREF}
          onClick={() => sub("call_now")}
          className="btn-quote inline-flex w-full items-center gap-3 whitespace-nowrap px-4 py-3 text-[12px] font-bold uppercase tracking-wide transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" /> Call now (phone app)
        </a>

        <a href={`facetime-audio://${PHONE_E164}`} onClick={() => sub("facetime")} className={rowClass}>
          <Video className="h-4 w-4 shrink-0" aria-hidden="true" /> FaceTime audio
        </a>
        <a
          href={`https://voice.google.com/u/0/calls?a=nc,%2B${PHONE_E164.replace("+", "")}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => sub("google_voice")}
          className={rowClass}
        >
          <Globe className="h-4 w-4 shrink-0" aria-hidden="true" /> Call from browser
        </a>
        <a href={SMS_HREF} onClick={() => sub("sms_click")} className={rowClass}>
          <MessageSquare className="h-4 w-4 shrink-0" aria-hidden="true" /> Text us
        </a>
        <button
          type="button"
          onClick={() => {
            sub("callback_request");
            setState(null);
            window.dispatchEvent(
              new CustomEvent("ss:open-quote", { detail: { source: `callback_${state.location}` } }),
            );
          }}
          className={rowClass}
        >
          <CalendarClock className="h-4 w-4 shrink-0" aria-hidden="true" /> Request a callback
        </button>
        <button
          type="button"
          onClick={() => {
            sub("copy_number");
            try {
              void navigator.clipboard?.writeText(PHONE_PLAIN);
            } catch {
              /* clipboard blocked, number is visible above */
            }
            setCopied(true);
          }}
          className={rowClass}
        >
          {copied ? (
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          {copied ? "Copied" : "Copy number"}
        </button>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-foreground/60">
        A web browser can&apos;t dial on its own. On a Mac or iPad use Call now or FaceTime (it rings
        through your iPhone); on any computer &quot;Call from browser&quot; opens Google Voice. Or just
        dial {PHONE_PLAIN}.
      </p>
    </div>
  );
}

/**
 * Any phone link, with your own label/classes.
 * Same behavior everywhere: dialer on phones, call card on desktop.
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
  hidePhoneTextOnNarrowDesktop = false,
  hidePhoneTextOnMobile = false,
}: {
  location: string;
  className?: string;
  /** Hide the number between 1024px and 1280px so the menu has room. */
  hidePhoneTextOnNarrowDesktop?: boolean;
  /** Hide the number on the narrowest phones so the CTA fits. */
  hidePhoneTextOnMobile?: boolean;
}) {
  const textClass = [
    hidePhoneTextOnMobile ? "hidden xs:inline" : "",
    hidePhoneTextOnNarrowDesktop ? "lg:hidden 2xl:inline" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <a
      href={PHONE_HREF}
      onClick={handleCall(location)}
      title={`Call ${PHONE_VANITY} (${PHONE_PLAIN})`}
      aria-label={`Call ${PHONE_VANITY}`}
      className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm font-semibold text-foreground transition hover:text-primary ${className}`}
    >
      <Phone className="h-4 w-4 shrink-0 text-amber-brand" aria-hidden="true" />
      <span className={textClass}>{PHONE_VANITY}</span>
    </a>
  );
}

export function StickyCallBar({ location = "sticky_mobile" }: { location?: string }) {
  return (
    <>
      {/* spacer so the bar never covers page content */}
      <div className="h-16 md:hidden" aria-hidden="true" />
      <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-2 gap-2 border-t border-hairline bg-background/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur md:hidden">
        <a
          href={PHONE_HREF}
          onClick={handleCall(location)}
          title={`Call ${PHONE_VANITY} (${PHONE_PLAIN})`}
          aria-label={`Call ${PHONE_VANITY}`}
          className="flex min-h-12 w-full items-center justify-center gap-2 bg-primary px-3 py-3 text-[12px] font-bold uppercase tracking-wide text-primary-foreground"
        >
          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" /> Call
        </a>
        <button
          type="button"
          onClick={() => goToLead(location)}
          data-savvy-cta="request_quote"
          aria-label="Free consultation, opens the Savvy Swim booking form"
          className="btn-quote flex min-h-12 w-full items-center justify-center px-3 py-3 text-[12px] font-bold uppercase tracking-wide"
        >
          Consultation
        </button>
      </div>
    </>
  );
}
