/**
 * Single source of truth for which deployed URLs the canary monitors.
 *
 * The route list is DERIVED from src/lib/route-manifest.gen.ts (generated from
 * the router's own route tree on every dev/build), so it cannot drift from what
 * is actually deployed: delete a page and it disappears from monitoring; add a
 * public page and it is monitored automatically.
 */

import { ROUTE_MANIFEST } from "./route-manifest.gen";

/** Route families that exist but must not be probed by an unauthenticated canary. */
const EXCLUDE_PREFIXES = [
  "/.", // framework/well-known endpoints
  "/admin", // staff-only, auth-gated
  "/api/", // handled by the explicit ALWAYS list below
  "/lovable", // platform email/auth endpoints
  "/mcp", // agent transport, POST-only
  "/schedule-qr", // internal, noindex tooling
];

/** Paths that take a token/param and cannot be probed with a static URL. */
const isParameterised = (path: string) => path.includes("$");

/** Endpoints always probed even though their prefix is excluded. */
const ALWAYS: string[] = ["/api/public/health"];

/** Highest-value pages, probed by the fast smoke test after a deploy. */
const SMOKE_PRIORITY = ["/", "/services", "/weekly-pool-service"];

export function selectCanaryRoutes(manifest: readonly string[] = ROUTE_MANIFEST): string[] {
  const monitored = manifest.filter(
    (path) => !isParameterised(path) && !EXCLUDE_PREFIXES.some((prefix) => path.startsWith(prefix)),
  );
  const always = ALWAYS.filter((path) => manifest.includes(path));
  return Array.from(new Set([...monitored, ...always]));
}

export function selectSmokeRoutes(manifest: readonly string[] = ROUTE_MANIFEST): string[] {
  const monitored = selectCanaryRoutes(manifest);
  const smoke = SMOKE_PRIORITY.filter((path) => monitored.includes(path));
  return smoke.length > 0 ? smoke : monitored.slice(0, 3);
}

export { ROUTE_MANIFEST };
