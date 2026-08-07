import { supabase } from "@/integrations/supabase/client";

export type ContactEventType = "call_click" | "text_click";

const SESSION_KEY = "savvy_session_id";
const ATTR_KEY = "savvy_attribution";

export type Attribution = {
  campaignId: string;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  landingPage: string | null;
  referrer: string | null;
};

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "unknown";
  }
}

function shortId(): string {
  try {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase();
  } catch {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
  }
}

/**
 * Captures UTM parameters on first page load of a session and mints a unique
 * campaign ID so calls, texts and form submissions can be attributed back to
 * the exact page + campaign that produced them.
 */
export function getAttribution(): Attribution {
  const fallback: Attribution = {
    campaignId: `DIRECT-${shortId()}`,
    utmSource: null,
    utmMedium: null,
    utmCampaign: null,
    utmTerm: null,
    utmContent: null,
    landingPage: null,
    referrer: null,
  };

  try {
    const stored = sessionStorage.getItem(ATTR_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Attribution;
      if (parsed?.campaignId) return parsed;
    }

    const params = new URLSearchParams(window.location.search);
    const get = (k: string) => {
      const v = params.get(k);
      return v ? v.slice(0, 120) : null;
    };

    const utmSource = get("utm_source");
    const utmCampaign = get("utm_campaign");
    const explicitId = get("campaign_id") || get("cid");

    const slug = (utmCampaign || utmSource || "direct")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .slice(0, 18)
      .replace(/^-|-$/g, "");

    const attribution: Attribution = {
      campaignId: explicitId ?? `${slug || "DIRECT"}-${shortId()}`,
      utmSource,
      utmMedium: get("utm_medium"),
      utmCampaign,
      utmTerm: get("utm_term"),
      utmContent: get("utm_content"),
      landingPage: window.location.pathname + window.location.search,
      referrer: document.referrer || null,
    };

    sessionStorage.setItem(ATTR_KEY, JSON.stringify(attribution));
    return attribution;
  } catch {
    return fallback;
  }
}

/** Appends campaign params to an internal link so page-to-page attribution survives. */
export function withCampaignParams(path: string): string {
  try {
    const a = getAttribution();
    const url = new URL(path, window.location.origin);
    url.searchParams.set("campaign_id", a.campaignId);
    if (a.utmSource) url.searchParams.set("utm_source", a.utmSource);
    if (a.utmMedium) url.searchParams.set("utm_medium", a.utmMedium);
    if (a.utmCampaign) url.searchParams.set("utm_campaign", a.utmCampaign);
    return url.pathname + url.search;
  } catch {
    return path;
  }
}

export const POOL_SMS_TEMPLATE = [
  "Hi Savvy Swim — I'd like a free pool service quote / visit.",
  "",
  "Name:",
  "Address:",
  "ZIP:",
  "Pool size (gallons or sq ft):",
  "Service needed (cleaning / repair / water care):",
  "Best time to reach me:",
].join("\n");


/**
 * Builds an sms: link with the prefilled inspection message. The body is kept
 * deterministic (no per-visitor campaign id) so the server-rendered href
 * matches the client's and hydration stays clean — campaign attribution is
 * recorded by trackContactClick() instead.
 */
export function buildSmsHref(phoneE164: string, message = POOL_SMS_TEMPLATE): string {
  return `sms:${phoneE164}?&body=${encodeURIComponent(message)}`;
}


/**
 * Fire-and-forget logging of a click-to-call / click-to-text interaction.
 * Never blocks or breaks the tel:/sms: navigation.
 */
export function trackContactClick(eventType: ContactEventType, placement: string) {
  try {
    const a = getAttribution();
    void supabase
      .from("contact_events")
      .insert({
        event_type: eventType,
        placement,
        page_path: window.location.pathname,
        referrer: document.referrer || null,
        session_id: getSessionId(),
        user_agent: navigator.userAgent,
        campaign_id: a.campaignId,
        utm_source: a.utmSource,
        utm_medium: a.utmMedium,
        utm_campaign: a.utmCampaign,
        utm_term: a.utmTerm,
        utm_content: a.utmContent,
        landing_page: a.landingPage,
      })
      .then(({ error }) => {
        if (error) console.warn("contact event not logged", error.message);
      });
  } catch (e) {
    console.warn("contact event not logged", e);
  }
}

export { getSessionId };
