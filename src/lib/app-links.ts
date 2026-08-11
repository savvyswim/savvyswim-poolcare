/**
 * App handoff links.
 *
 * savvyswim.com is the marketing website. Everything transactional — customer
 * portal, billing, checkout, staff CRM — lives in the Savvy Swim app at
 * savvyswim.app. Both share one backend, so a handoff is just a link.
 */

const RAW_CRM_URL = (import.meta.env['VITE_CRM_URL'] as string | undefined)?.trim();

/** Base URL of the Savvy Swim app. */
export const CRM_BASE_URL = (RAW_CRM_URL || "https://savvyswim.app").replace(/\/+$/, "");

/** The CRM always lives in its own deployment now. */
export const CRM_IS_EXTERNAL = true;

function join(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${CRM_BASE_URL}${p}`;
}

/** Absolute URL for any CRM/portal path. */
export const appUrl = join;

/** Customer portal entry point. */
export const PORTAL_PATH = "/portal";
export const portalUrl = (path = "") => join(`${PORTAL_PATH}${path}`);

/** Staff / admin CRM entry point. */
export const STAFF_LOGIN_PATH = "/admin/crm/login";
export const staffLoginUrl = () => join(STAFF_LOGIN_PATH);

/** Customer login / account entry point. */
export const customerLoginUrl = () => join("/portal");

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
];

/**
 * Build a handoff link into the app, carrying the selected plan/product and the
 * visitor's campaign attribution so the CRM can credit the lead correctly.
 */
export function buildCrmLink(
  path: string,
  params: Record<string, string | number | undefined | null> = {},
): string {
  const url = new URL(join(path));

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && `${value}`.length > 0) {
      url.searchParams.set(key, `${value}`);
    }
  }

  if (typeof window !== "undefined") {
    const here = new URLSearchParams(window.location.search);
    for (const key of ATTRIBUTION_KEYS) {
      const v = here.get(key);
      if (v && !url.searchParams.has(key)) url.searchParams.set(key, v);
    }
    if (!url.searchParams.has("ref")) url.searchParams.set("ref", "savvyswim.com");
    if (!url.searchParams.has("from")) url.searchParams.set("from", window.location.pathname);
  } else {
    url.searchParams.set("ref", "savvyswim.com");
  }

  return url.toString();
}

/* ------------------------------------------------------------------ *
 * Lead capture + membership checkout — both live in the CRM app.
 * ------------------------------------------------------------------ */

/** Booking / free-inspection form inside the Savvy Swim app. */
export const LEAD_PATH = "/book";

/**
 * Handoff URL for every lead button on the marketing site (Book, Request a
 * free inspection, city-page CTAs). Attribution is appended automatically.
 */
export function leadUrl(
  source: string,
  params: Record<string, string | number | undefined | null> = {},
): string {
  return buildCrmLink(LEAD_PATH, { source, ...params });
}

const RAW_SWIM_CLUB_URL = (
  import.meta.env['VITE_SWIM_CLUB_STRIPE_URL'] as string | undefined
)?.trim();

/**
 * Swim Club ($19.99/mo) purchase link. Points at the Stripe payment link
 * issued by the CRM when VITE_SWIM_CLUB_STRIPE_URL is set; otherwise it falls
 * back to the CRM's join screen, which creates the same checkout session.
 */
export function swimClubCheckoutUrl(source: string): string {
  if (RAW_SWIM_CLUB_URL) {
    const url = new URL(RAW_SWIM_CLUB_URL);
    url.searchParams.set("utm_source", "savvyswim.com");
    url.searchParams.set("utm_content", source);
    return url.toString();
  }
  return buildCrmLink("/join/swim-club", { source });
}
