/**
 * Single source of truth for which deployed URLs the canary monitors.
 *
 * The route list is DERIVED from src/lib/route-manifest.gen.ts (generated from
 * the router's own route tree on every dev/build), so it cannot drift from what
 * is actually deployed: delete a page and it disappears from monitoring; add a
 * public page and it is monitored automatically.
 */

import { REDIRECT_ROUTES, ROUTE_MANIFEST } from "./route-manifest.gen";

/** Route families that cannot be probed meaningfully over plain GET. */
const EXCLUDE_PREFIXES = [
  "/.", // framework/well-known endpoints
  "/api/", // handled by the explicit ALWAYS list below
  "/lovable", // platform email/auth endpoints
  "/mcp", // agent transport, POST-only
  "/schedule-qr", // internal, noindex tooling
];

/**
 * Staff / customer areas we DO serve. They must return a real page shell (their
 * auth gate runs client-side) or a redirect to sign-in. Anything else, such as
 * a 404 or a 5xx, is a genuine outage worth paging on.
 */
const GUARDED_PREFIXES = ["/admin", "/portal"];

/** Paths that take a token/param and cannot be probed with a static URL. */
const isParameterised = (path: string) => path.includes("$");

/** Endpoints always probed even though their prefix is excluded. */
const ALWAYS: string[] = ["/api/public/health"];

/** Highest-value pages, probed by the fast smoke test after a deploy. */
const SMOKE_PRIORITY = ["/", "/services", "/weekly-pool-service", "/schedule"];

export function selectCanaryRoutes(manifest: readonly string[] = ROUTE_MANIFEST): string[] {
  const monitored = manifest.filter(
    (path) => !isParameterised(path) && !EXCLUDE_PREFIXES.some((prefix) => path.startsWith(prefix)),
  );
  const always = ALWAYS.filter((path) => manifest.includes(path));
  return Array.from(new Set([..monitored, ..always]));
}

/** Auth-gated routes the canary still probes (accepting a sign-in redirect or 401/403). */
export function selectGuardedRoutes(manifest: readonly string[] = ROUTE_MANIFEST): string[] {
  return selectCanaryRoutes(manifest).filter((path) => isGuardedRoute(path));
}

export function isGuardedRoute(path: string): boolean {
  return GUARDED_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`));
}

export function selectSmokeRoutes(manifest: readonly string[] = ROUTE_MANIFEST): string[] {
  const monitored = selectCanaryRoutes(manifest);
  const smoke = SMOKE_PRIORITY.filter((path) => monitored.includes(path));
  return smoke.length > 0 ? smoke : monitored.slice(0, 3);
}


/** True when the route tree declares this path as a permanent redirect. */
export function isRedirectRoute(path: string): boolean {
  return (REDIRECT_ROUTES as readonly string[]).includes(path);
}

export { REDIRECT_ROUTES, ROUTE_MANIFEST };
