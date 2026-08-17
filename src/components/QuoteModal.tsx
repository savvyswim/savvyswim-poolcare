import { onCallClick } from "@/components/CallButton";
/**
 * On-site lead capture.
 *
 * Two variants share one form:
 *  - "booking"    — Book your inspection or 3D quote (every quote CTA)
 *  - "water_test" — Free water test (side tab)
 *
 * Opening is event driven so any page can trigger it without prop drilling:
 *   window.dispatchEvent(new CustomEvent("ss:open-quote", { detail: { source } }))
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "@tanstack/react-router";
import LeadForm, { SERVICES, WATER_TESTS } from "@/components/LeadForm";

export const QUOTE_EVENT = "ss:open-quote";

export type QuoteVariant = "booking" | "water_test";

export type QuoteDetail = {
  source?: string;
  service?: string | undefined;
  variant?: QuoteVariant;
};

/**
 * Stamp a CTA name with the page it was clicked on ("<cta>:<path>") so every
 * lead — homepage, weekly plan hub, city page — reports and syncs with the
 * page it came from. Already-stamped sources pass through untouched.
 */
function withPage(source: string): string {
  if (typeof window === "undefined" || source.includes(":")) return source;
  const path = window.location.pathname.replace(/\/+$/, "") || "/home";
  return `${source}:${path.slice(0, 60)}`;
}

/** Open the quote modal from anywhere (client only). */
export function openQuoteModal(detail: QuoteDetail = {}) {
  if (typeof window === "undefined") return;
  const stamped: QuoteDetail = detail.source
    ? { ...detail, source: withPage(detail.source) }
    : detail;
  window.dispatchEvent(new CustomEvent<QuoteDetail>(QUOTE_EVENT, { detail: stamped }));
}

/** Open the free water test form (client only). */
export function openWaterTestModal(source = "water_test_tab") {
  openQuoteModal({ source, variant: "water_test" });
}


const COPY: Record<
  QuoteVariant,
  {
    eyebrow: string;
    title: string;
    desc: string;
    optionsLabel: string;
    options: readonly string[];
    cta: string;
    submit: string;
  }
> = {
  booking: {
    eyebrow: "Free · No obligation",
    title: "Book your inspection or 3D quote",
    desc: "Pick a time — we'll confirm by phone or email within one business day.",
    optionsLabel: "Which service?",
    options: SERVICES,
    cta: "free_pool_visit",
    submit: "Book it",
  },
  water_test: {
    eyebrow: "Free · Lab-grade accuracy",
    title: "Book your free water test",
    desc: "Drop a sample or we'll test on site — full chemistry report within one business day.",
    optionsLabel: "Which test?",
    options: WATER_TESTS,
    cta: "water_test",
    submit: "Book my water test",
  },
};

export default function QuoteModal() {
  const [open, setOpen] = useState(false);
  const [variant, setVariant] = useState<QuoteVariant>("booking");
  const [source, setSource] = useState("site");
  const [service, setService] = useState<string | undefined>(undefined);
  const [done, setDone] = useState<null | { date?: Date | undefined; time?: string | undefined }>(
    null,
  );

  const openedAt = useRef<number>(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setDone(null);
    const el = returnFocusTo.current;
    if (el && typeof el.focus === "function") window.setTimeout(() => el.focus(), 0);
  }, []);

  // Open on custom event, and on ?quote=1 (legacy /book style links).
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<QuoteDetail>).detail || {};
      returnFocusTo.current = (document.activeElement as HTMLElement) ?? null;
      setVariant(detail.variant ?? "booking");
      setSource(withPage(detail.source || "site"));
      setService(detail.service);
      setDone(null);
      openedAt.current = Date.now();
      setOpen(true);
    };
    window.addEventListener(QUOTE_EVENT, onOpen as EventListener);

    const params = new URLSearchParams(window.location.search);
    if (params.get("quote") === "1") {
      openQuoteModal({ source: params.get("source") || "deep_link" });
    }
    return () => window.removeEventListener(QUOTE_EVENT, onOpen as EventListener);
  }, []);

  // Escape to close, focus trap, body scroll lock.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.setTimeout(() => {
      dialogRef.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
    }, 30);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const nodes = dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]):not([tabindex="-1"]),textarea,select',
      );
      if (nodes.length === 0) return;
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close]);

  if (!open) return null;

  const copy = COPY[variant];

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-[#2a1013]/70 p-0 backdrop-blur-sm sm:items-center sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ss-quote-title"
        aria-describedby="ss-quote-desc"
        className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto border border-[#8E1F2C]/25 bg-[#F4EFE3] p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close the form"
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center text-2xl leading-none text-[#8E1F2C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8E1F2C]"
        >
          ×
        </button>

        {done ? (
          <div className="py-6 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#1FA9BE]">
              Request received
            </p>
            <h2
              id="ss-quote-title"
              className="mt-3 font-display text-3xl uppercase leading-none text-[#8E1F2C] sm:text-4xl"
            >
              You&apos;re on the board
            </h2>
            <p id="ss-quote-desc" className="mt-3 text-[15px] text-[#2a1013]/75">
              {done.date ? (
                <>
                  We&apos;ve got you down for{" "}
                  <strong>
                    {format(done.date, "EEE, MMM d")}
                    {done.time ? ` at ${done.time}` : ""}
                  </strong>
                  . We&apos;ll confirm by phone or email within one business day.
                </>
              ) : (
                <>A Savvy Swim tech will reach out within one business day.</>
              )}
            </p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <a
                href="tel:+18176637665"
                onClick={onCallClick("quote_modal_success")}
                className="min-h-[48px] flex-1 border border-[#8E1F2C]/30 px-6 py-3 text-sm font-semibold uppercase tracking-[0.12em] text-[#8E1F2C]"
              >
                Call us now
              </a>
              <button
                type="button"
                onClick={close}
                className="min-h-[48px] flex-1 bg-[#8E1F2C] px-6 font-semibold uppercase tracking-[0.12em] text-[#F4EFE3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1FA9BE]"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#1FA9BE]">
              {copy.eyebrow}
            </p>
            <h2
              id="ss-quote-title"
              className="mt-2 font-display text-3xl uppercase leading-[0.95] text-[#8E1F2C] sm:text-4xl"
            >
              {copy.title}
            </h2>
            <p id="ss-quote-desc" className="mt-2 text-[15px] text-[#2a1013]/75">
              {copy.desc}
            </p>

            <LeadForm
              cta={copy.cta}
              optionsLabel={copy.optionsLabel}
              options={copy.options}
              defaultOption={variant === "booking" ? service : undefined}
              source={source}
              submitLabel={copy.submit}
              openedAt={openedAt.current}
              onCancel={close}
              onDone={(summary) => setDone(summary)}
            />
          </>
        )}
      </div>
    </div>
  );
}
