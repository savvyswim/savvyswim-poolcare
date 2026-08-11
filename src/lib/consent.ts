/**
 * Cookie / tracking consent.
 *
 * The Savvy Swim lead-capture embed (savvyswim.app) sets identifiers, so it is
 * only injected after the visitor accepts. Nothing here runs during SSR.
 */

export type ConsentValue = "accepted" | "declined";

const STORAGE_KEY = "ss_consent_v1";
export const CONSENT_EVENT = "ss:consent-change";

const LEAD_EMBED_SRC = "https://savvyswim.app/embed/savvy-leads.js";

export function getConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "accepted" || v === "declined" ? v : null;
  } catch {
    return null;
  }
}

export function setConsent(value: ConsentValue) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    /* private mode — consent just won't persist */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: value }));
  if (value === "accepted") loadLeadEmbed();
}

/** Inject the CRM lead-capture embed once, after consent. */
export function loadLeadEmbed() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src="${LEAD_EMBED_SRC}"]`)) return;
  const s = document.createElement("script");
  s.src = LEAD_EMBED_SRC;
  s.defer = true;
  s.dataset["ssConsent"] = "granted";
  document.head.appendChild(s);
}
