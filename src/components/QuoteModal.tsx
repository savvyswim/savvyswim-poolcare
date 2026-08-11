/**
 * On-site lead capture.
 *
 * Every "Request a quote" / "Book free inspection" button on the marketing
 * site opens this modal instead of handing the visitor off to another app.
 * Submissions go to our own hardened endpoint (POST /api/public/leads), which
 * validates, rate limits and writes the lead where the CRM reads it.
 *
 * Opening is event driven so any page can trigger it without prop drilling:
 *   window.dispatchEvent(new CustomEvent("ss:open-quote", { detail: { source } }))
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { trackSiteEvent } from "@/lib/site-analytics";

export const QUOTE_EVENT = "ss:open-quote";

export type QuoteDetail = {
  source?: string;
  service?: string | undefined;
};

/** Open the quote modal from anywhere (client only). */
export function openQuoteModal(detail: QuoteDetail = {}) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<QuoteDetail>(QUOTE_EVENT, { detail }));
}

type Status = "idle" | "sending" | "done" | "error";

const FIELD =
  "w-full min-h-[48px] border border-[#8E1F2C]/25 bg-white px-4 py-3 text-[15px] text-[#2a1013] placeholder:text-[#2a1013]/45 outline-none focus-visible:border-[#8E1F2C] focus-visible:ring-2 focus-visible:ring-[#8E1F2C]/30";

export default function QuoteModal() {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState("site");
  const [service, setService] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const openedAt = useRef<number>(0);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const firstFieldRef = useRef<HTMLInputElement | null>(null);
  const returnFocusTo = useRef<HTMLElement | null>(null);

  const close = useCallback(() => {
    setOpen(false);
    setStatus("idle");
    setError(null);
    const el = returnFocusTo.current;
    if (el && typeof el.focus === "function") window.setTimeout(() => el.focus(), 0);
  }, []);

  // Open on custom event, and on ?quote=1 (legacy /book style links).
  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<QuoteDetail>).detail || {};
      returnFocusTo.current = (document.activeElement as HTMLElement) ?? null;
      setSource(detail.source || "site");
      setService(detail.service);
      setStatus("idle");
      setError(null);
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
    window.setTimeout(() => firstFieldRef.current?.focus(), 30);

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

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "sending") return;
    const form = e.currentTarget;
    const fd = new FormData(form);
    const get = (k: string) => (fd.get(k) || "").toString().trim();

    const params = new URLSearchParams(window.location.search);
    const body: Record<string, unknown> = {
      full_name: get("full_name"),
      email: get("email"),
      phone: get("phone") || null,
      address: get("address") || null,
      message: get("message") || null,
      pool_details: service ?? null,
      source,
      page: window.location.pathname.slice(0, 200),
      utm_source: params.get("utm_source") || "savvyswim.com",
      utm_medium: params.get("utm_medium") || null,
      utm_campaign: params.get("utm_campaign") || null,
      elapsed_ms: Math.max(0, Date.now() - openedAt.current),
      company: get("company"),
    };

    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        trackSiteEvent("lead_click", `${source}_submitted`);
        setStatus("done");
        return;
      }
      setStatus("error");
      setError(
        data.error ||
          "We couldn't send that just now. Try again, or call us at (469) 744-0379.",
      );
    } catch {
      setStatus("error");
      setError("Network hiccup. Try again, or call us at (469) 744-0379.");
    }
  }

  if (!open) return null;

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
        className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto border border-[#8E1F2C]/25 bg-[#F4EFE3] p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={close}
          aria-label="Close the quote form"
          className="absolute right-3 top-3 flex h-11 w-11 items-center justify-center text-2xl leading-none text-[#8E1F2C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8E1F2C]"
        >
          ×
        </button>

        {status === "done" ? (
          <div className="py-6 text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#1FA9BE]">
              Lead received
            </p>
            <h2
              id="ss-quote-title"
              className="mt-3 font-display text-3xl uppercase leading-none text-[#8E1F2C] sm:text-4xl"
            >
              You&apos;re on the board
            </h2>
            <p id="ss-quote-desc" className="mt-3 text-[15px] text-[#2a1013]/75">
              A Savvy Swim tech will reach out within one business day. Need us sooner? Call{" "}
              <a className="underline" href="tel:+14697440379">
                (469) 744-0379
              </a>
              .
            </p>
            <button
              type="button"
              onClick={close}
              className="mt-6 min-h-[48px] w-full bg-[#8E1F2C] px-6 font-semibold uppercase tracking-[0.12em] text-[#F4EFE3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1FA9BE]"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-[#1FA9BE]">
              Free · No obligation
            </p>
            <h2
              id="ss-quote-title"
              className="mt-2 font-display text-3xl uppercase leading-[0.95] text-[#8E1F2C] sm:text-4xl"
            >
              Request a quote
            </h2>
            <p id="ss-quote-desc" className="mt-2 text-[15px] text-[#2a1013]/75">
              Tell us where the pool is and we&apos;ll call you right back — usually the same day.
            </p>

            <form onSubmit={onSubmit} className="mt-6 space-y-3" noValidate={false}>
              <label className="block">
                <span className="sr-only">Full name</span>
                <input
                  ref={firstFieldRef}
                  name="full_name"
                  required
                  minLength={2}
                  autoComplete="name"
                  placeholder="Your name"
                  className={FIELD}
                />
              </label>
              <label className="block">
                <span className="sr-only">Phone number</span>
                <input
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="Phone"
                  className={FIELD}
                />
              </label>
              <label className="block">
                <span className="sr-only">Email address</span>
                <input
                  name="email"
                  type="email"
                  required
                  inputMode="email"
                  autoComplete="email"
                  placeholder="Email"
                  className={FIELD}
                />
              </label>
              <label className="block">
                <span className="sr-only">Pool address</span>
                <input
                  name="address"
                  autoComplete="street-address"
                  placeholder="Pool address"
                  className={FIELD}
                />
              </label>
              <label className="block">
                <span className="sr-only">Anything we should know?</span>
                <textarea
                  name="message"
                  rows={3}
                  placeholder="Anything we should know? (green pool, equipment, timing…)"
                  className={FIELD}
                />
              </label>

              {/* Honeypot — real people never fill this in. */}
              <input
                name="company"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                className="hidden"
              />

              <div aria-live="polite" className="min-h-[1.25rem]">
                {error ? <p className="text-sm font-medium text-[#8E1F2C]">{error}</p> : null}
              </div>

              <button
                type="submit"
                disabled={status === "sending"}
                className="min-h-[52px] w-full bg-[#8E1F2C] px-6 font-semibold uppercase tracking-[0.12em] text-[#F4EFE3] transition-opacity disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1FA9BE]"
              >
                {status === "sending" ? "Sending…" : "Send it"}
              </button>
              <div className="flex items-center justify-between gap-4 pt-1">
                <button
                  type="button"
                  onClick={close}
                  className="min-h-[44px] text-sm uppercase tracking-[0.12em] text-[#2a1013]/60 underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8E1F2C]"
                >
                  Never mind
                </button>
                <a
                  href="tel:+14697440379"
                  className="min-h-[44px] text-sm uppercase tracking-[0.12em] text-[#8E1F2C] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8E1F2C]"
                >
                  Call instead
                </a>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
