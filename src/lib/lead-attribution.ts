/**
 * First-touch marketing attribution for every lead.
 *
 * Campaign parameters (utm_*, campaign code, ad click ids) are captured on the
 * FIRST page of the session and kept in sessionStorage, so a booking still
 * attributes back to the campaign even if the visitor browses a few pages,
 * uses the sticky call bar, or lands on /schedule from a QR code and the
 * params drop off the URL before they submit.
 */

const KEY = "ss_attr_v1";

export type LeadAttribution = {
  campaign_id: string | null;
  campaign_code: string | null; // ?src= — flyer / truck decal / QR batch code
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  gclid: string | null;
  fbclid: string | null;
  landing_page: string | null;
  referrer: string | null;
};

const EMPTY: LeadAttribution = {
  campaign_id: null,
  campaign_code: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_term: null,
  utm_content: null,
  gclid: null,
  fbclid: null,
  landing_page: null,
  referrer: null,
};

function clip(value: string | null, max = 120): string | null {
  const v = value?.trim();
  return v ? v.slice(0, max) : null;
}

function read(): LeadAttribution | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LeadAttribution>;
    return { ...EMPTY, ...parsed };
  } catch {
    return null;
  }
}

/** True when the current URL actually carries campaign information. */
function fromUrl(): LeadAttribution | null {
  const p = new URLSearchParams(window.location.search);
  const code = clip(p.get("src") ?? p.get("campaign") ?? p.get("c"), 40);
  const utmSource = clip(p.get("utm_source"));
  const utmCampaign = clip(p.get("utm_campaign"));
  const explicitId = clip(p.get("campaign_id") ?? p.get("cid"), 60);
  const gclid = clip(p.get("gclid"), 200);
  const fbclid = clip(p.get("fbclid"), 200);

  if (!code && !utmSource && !utmCampaign && !explicitId && !gclid && !fbclid) return null;

  const slug = (utmCampaign || code || utmSource || "campaign")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);

  return {
    campaign_id: explicitId ?? slug ?? null,
    campaign_code: code,
    utm_source: utmSource ?? (gclid ? "google" : fbclid ? "facebook" : null),
    utm_medium: clip(p.get("utm_medium")) ?? (code ? "offline" : gclid || fbclid ? "cpc" : null),
    utm_campaign: utmCampaign ?? code,
    utm_term: clip(p.get("utm_term")),
    utm_content: clip(p.get("utm_content")),
    gclid,
    fbclid,
    landing_page: `${window.location.pathname}${window.location.search}`.slice(0, 255),
    referrer: clip(document.referrer, 255),
  };
}

/**
 * Records campaign params the first time they appear in a session.
 * Safe to call on every page view — later page views never overwrite the
 * first touch unless the visitor arrives with brand-new campaign params.
 */
export function captureAttribution(): LeadAttribution {
  if (typeof window === "undefined") return EMPTY;
  const stored = read();
  const current = fromUrl();
  try {
    if (current) {
      // A fresh campaign click wins over a stale one from earlier in the session.
      sessionStorage.setItem(KEY, JSON.stringify(current));
      return current;
    }
    if (stored) return stored;
    const baseline: LeadAttribution = {
      ...EMPTY,
      landing_page: `${window.location.pathname}${window.location.search}`.slice(0, 255),
      referrer: clip(document.referrer, 255),
    };
    sessionStorage.setItem(KEY, JSON.stringify(baseline));
    return baseline;
  } catch {
    return current ?? stored ?? EMPTY;
  }
}

/** Attribution to attach to a lead submission. */
export function getLeadAttribution(): LeadAttribution {
  if (typeof window === "undefined") return EMPTY;
  return read() ?? captureAttribution();
}
