/**
 * App handoff links.
 *
 * The website and the CRM are being split into two separate apps that share one
 * backend. Until the CRM moves to its own domain, VITE_CRM_URL is unset and every
 * link below stays internal, so nothing changes for users. Once the CRM project is
 * live at (for example) https://crm.savvyswim.com, set VITE_CRM_URL there and the
 * website automatically hands off instead of rendering the CRM itself.
 */

const RAW_CRM_URL = (import.meta.env['VITE_CRM_URL'] as string | undefined)?.trim();

/** Base URL of the CRM app, or "" when the CRM still lives in this project. */
export const CRM_BASE_URL = RAW_CRM_URL ? RAW_CRM_URL.replace(/\/+$/, "") : "";

/** True when the CRM/portal live in a separate deployment. */
export const CRM_IS_EXTERNAL = CRM_BASE_URL.length > 0;

function join(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return CRM_IS_EXTERNAL ? `${CRM_BASE_URL}${p}` : p;
}

/** Absolute (or local) URL for any CRM/portal path. */
export const appUrl = join;

/** Customer portal entry point. */
export const PORTAL_PATH = "/portal";
export const portalUrl = (path = "") => join(`${PORTAL_PATH}${path}`);

/** Staff / admin CRM entry point. */
export const STAFF_LOGIN_PATH = "/admin/crm/login";
export const staffLoginUrl = () => join(STAFF_LOGIN_PATH);
