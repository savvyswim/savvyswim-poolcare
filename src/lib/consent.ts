/**
 * Cookie / tracking consent.
 *
 * Lead capture lives on this site (see QuoteModal). After consent we also load
 * the Savvy Swim CRM connector, which mirrors submissions into the CRM lead
 * inbox with page / campaign attribution. Nothing here runs during SSR.
 */

export type ConsentValue = "accepted" | "declined";

const STORAGE_KEY = "ss_consent_v1";
export const CONSENT_EVENT = "ss:consent-change";

/** CRM lead-mirror connector. Loaded only after the visitor accepts. */
const CRM_EMBED_SRC = "https://savvyswim.app/embed/savvy-leads.js";

export function loadCrmLeadMirror() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`script[src="${CRM_EMBED_SRC}"]`)) return;
  const s = document.createElement("script");
  s.src = CRM_EMBED_SRC;
  s.defer = true;
  document.head.appendChild(s);
}



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
}



/** Clear the stored choice so the banner reappears (footer "Cookie settings"). */
export function resetConsent() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: null }));
}
