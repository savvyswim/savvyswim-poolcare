import { useEffect, useRef, useState } from "react";
import { Phone, MessageSquare, Copy, Check, CalendarClock } from "lucide-react";
import { PHONE_E164, PHONE_HREF, PHONE_PLAIN, PHONE_VANITY } from "@/lib/contact-info";
import { trackContactClick } from "@/lib/contactTracking";

/**
 * Tap-to-call controls.
 *
 * Phones and tablets: plain `tel:` anchors, so the device opens its dialer.
 * Desktop browsers: we open a small call card instead of leaving the visitor
 * on a blank tab — it still offers a real `tel:` "Call now" (Macs/iPads hand
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

/** True only on a real desktop browser, which may have no dialer for `tel:`. */
function isDesktop() {
  if (typeof window === "undefined") return false;
  const touch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const mobileUa = /android|iphone|ipad|ipod|mobile|silk|kindle/i.test(navigator.userAgent);
  const narrow = window.innerWidth <= 820;
  return !touch && !mobileUa && !narrow;
}

type CardDetail = { location: string; x: number; y: number };

export function handleCall(location: string) {
  return (e: React.MouseEvent<HTMLAnchorElement>) => {
    track(location);
    // Phones and tablets: let the OS open the dialer (never intercept).
    if (!isDesktop()) return;
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    window.dispatchEvent(
      new CustomEvent<CardDetail>(CALL_CARD_EVENT, {
        detail: { location, x: rect.left + rect.width / 2, y: rect.bottom },
      }),
    );
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
      trackContactClick(action, state.location);
    } catch {
      /* non-blocking */
    }
  };

  const width = 288;
  const left = Math.min(Math.max(state.x - width / 2, 12), window.innerWidth - width - 12);
  const top = Math.min(state.y + 10, window.innerHeight - 320);

  const rowClass =
    "flex items-center gap-3 border border-[#8E1F2C]/20 px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#8E1F2C] transition hover:bg-[#8E1F2C] hover:text-[#F4EFE3]";

  return (
    <div
      ref={cardRef}
      role="dialog"
      aria-label={`Call ${PHONE_VANITY}`}
      style={{ position: "fixed", left, top, width }}
      className="z-[130] border border-[#8E1F2C]/30 bg-[#F4EFE3] p-4 shadow-2xl"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#1FA9BE]">Call Savvy Swim</p>
      <p className="mt-1 select-all font-display text-2xl uppercase leading-none text-[#8E1F2C]">
        {PHONE_VANITY}
      </p>
      <p className="select-all text-[13px] text-[#2a1013]/70">{PHONE_PLAIN}</p>

      <div className="mt-4 flex flex-col gap-2">
        <a href={PHONE_HREF} onClick={() => sub("call_now")} className={rowClass}>
          <Phone className="h-4 w-4 shrink-0" aria-hidden="true" /> Call now
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
              /* clipboard blocked — number is visible above */
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

      <p className="mt-3 text-[11px] leading-snug text-[#2a1013]/60">
        On a Mac or iPad, “Call now” places the call through your iPhone or FaceTime.
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
