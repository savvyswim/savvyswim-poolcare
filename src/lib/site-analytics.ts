/**
 * First-party consent + conversion analytics.
 *
 * Anonymous by design: we record what happened, on which page, and what the
 * visitor's consent state was at that moment. No identifiers, no cookies — so
 * visitors who decline are still counted (just as anonymously as everyone else).
 */

import { getConsent } from "./consent";

export type SiteEventName =
  | "banner_shown"
  | "banner_accepted"
  | "banner_declined"
  | "banner_reopened"
  | "lead_click"
  | "swim_club_click"
  | "call_click";

type Payload = {
  event: SiteEventName;
  page: string;
  button?: string | undefined;
  consent: "accepted" | "declined" | "unset";
  utm_source?: string | undefined;
  utm_medium?: string | undefined;
  utm_campaign?: string | undefined;
};

const ENDPOINT = "/api/public/events";

let queue: Payload[] = [];
let flushTimer: number | undefined;

function flush() {
  if (typeof window === "undefined" || queue.length === 0) return;
  const body = JSON.stringify({ events: queue });
  queue = [];
  flushTimer = undefined;
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }
  } catch {
    /* fall through to fetch */
  }
  void fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}

/** Queue an event; sends in a small batch so clicks never block navigation. */
export function trackSiteEvent(event: SiteEventName, button?: string) {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  queue.push({
    event,
    page: window.location.pathname.slice(0, 200),
    button: button?.slice(0, 80),
    consent: getConsent() ?? "unset",
    utm_source: params.get("utm_source")?.slice(0, 120) ?? undefined,
    utm_medium: params.get("utm_medium")?.slice(0, 120) ?? undefined,
    utm_campaign: params.get("utm_campaign")?.slice(0, 120) ?? undefined,
  });
  if (queue.length >= 10) {
    flush();
    return;
  }
  if (flushTimer === undefined) {
    flushTimer = window.setTimeout(flush, 1500);
  }
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flush();
  });
}

/* ------------------------------------------------------------------ *
 * Lead capture happens on this site; only checkout/portal links hand off.
 * ------------------------------------------------------------------ */

import { swimClubCheckoutUrl } from "./app-links";
import { openQuoteModal } from "@/components/QuoteModal";

/** Open the on-site quote form, tagged with the button that triggered it. */
export function goToLead(
  source: string,
  params: Record<string, string | number | undefined | null> = {},
) {
  trackSiteEvent("lead_click", source);
  const service = params['service'];
  openQuoteModal({
    source,
    service: service === undefined || service === null ? undefined : `${service}`,
  });
}

/**
 * Send the visitor to the Swim Club checkout, tagged with the button.
 * If no live checkout is configured yet, open the on-site form pre-tagged
 * with the membership so the lead still reaches us.
 */
export function goToSwimClub(source: string) {
  trackSiteEvent("swim_club_click", source);
  const url = swimClubCheckoutUrl(source);
  if (url) {
    window.location.href = url;
    return;
  }
  openQuoteModal({
    source: `swim_club_${source}`,
    service: "Savvy Swim Club membership — $19.99/mo",
  });
}

