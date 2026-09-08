/**
 * Lightweight openers for the on-site lead modal.
 *
 * Kept apart from the modal component so pages and buttons can trigger it
 * without pulling the form (calendar, address autocomplete, date-fns) into
 * their own bundle. The modal itself is loaded on first open.
 */

export const QUOTE_EVENT = "ss:open-quote";

export type QuoteVariant = "booking" | "water_test";

export type QuoteDetail = {
  source?: string;
  service?: string | undefined;
  variant?: QuoteVariant;
};

/**
 * Stamp a CTA name with the page it was clicked on ("<cta>:<path>") so every
 * lead, homepage, weekly plan hub, city page, reports and syncs with the
 * page it came from. Already-stamped sources pass through untouched.
 */
export function withPage(source: string): string {
  if (typeof window === "undefined" || source.includes(":")) return source;
  const path = window.location.pathname.replace(/\/+$/, "") || "/home";
  return `${source}:${path.slice(0, 60)}`;
}

/**
 * Last requested open, kept so a modal that is still loading when the button
 * was clicked can pick the request up as soon as it mounts.
 */
let pending: QuoteDetail | null = null;

/** Read and clear the pending open request. */
export function takePendingQuote(): QuoteDetail | null {
  const detail = pending;
  pending = null;
  return detail;
}

/** Open the quote modal from anywhere (client only). */
export function openQuoteModal(detail: QuoteDetail = {}) {
  if (typeof window === "undefined") return;
  const stamped: QuoteDetail = detail.source
    ? { ..detail, source: withPage(detail.source) }
    : detail;
  pending = stamped;
  window.dispatchEvent(new CustomEvent<QuoteDetail>(QUOTE_EVENT, { detail: stamped }));
}

/** Open the free water test form (client only). */
export function openWaterTestModal(source = "water_test_tab") {
  openQuoteModal({ source, variant: "water_test" });
}

