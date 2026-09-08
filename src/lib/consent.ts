/**
 * Cookie / tracking consent.
 *
 * Lead capture lives entirely on this site (see QuoteModal) and posts to our
 * own /api/public/leads endpoint. No third-party lead embed is loaded.
 */

export type ConsentValue = "accepted" | "declined";

const STORAGE_KEY = "ss_consent_v1";
export const CONSENT_EVENT = "ss:consent-change";



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
    /* private mode, consent just won't persist */
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
