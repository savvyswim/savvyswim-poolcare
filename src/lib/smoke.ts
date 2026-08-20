/**
 * Manifest-driven smoke test plan.
 *
 * The routes probed here come from the SAME generated manifest the canary uses
 * (src/lib/route-manifest.gen.ts via canary-routes), so smoke coverage can never
 * drift from what the router actually serves. Pure functions only — no fetch,
 * no env — so they are unit-testable and safe to import anywhere.
 */
import { isGuardedRoute, selectCanaryRoutes, selectSmokeRoutes } from "./canary-routes";
import { looksLikeCrashBody } from "./canary";

export type SmokeTarget = { route: string; guarded: boolean };

export type SmokeOutcome = {
  route: string;
  status: number | null;
  ok: boolean;
  note: string;
};

/** Every generated canary route, flagged for auth-gated handling. */
export function buildSmokeTargets(mode: "full" | "fast" = "full"): SmokeTarget[] {
  const routes = mode === "fast" ? selectSmokeRoutes() : selectCanaryRoutes();
  return routes.map((route) => ({ route, guarded: isGuardedRoute(route) }));
}

/** Minimum bytes an SSR HTML page must return before we call it rendered. */
export const MIN_HTML_BYTES = 500;

/**
 * Decide pass/fail for one probe.
 *
 * - JSON endpoints (health) only need a 2xx.
 * - Guarded routes may 200, redirect to sign-in, or return 401/403.
 * - Public pages must be 200, non-blank HTML with no SSR crash payload.
 */
export function evaluateSmokeProbe(input: {
  route: string;
  guarded: boolean;
  status: number | null;
  body: string;
  location?: string | null;
  error?: string | null;
  json?: boolean;
}): SmokeOutcome {
  const { route, guarded, status, body, location, error, json } = input;
  const fail = (note: string): SmokeOutcome => ({ route, status, ok: false, note });

  if (error || status === null) return fail(error ?? "no response");
  if (json) {
    return status >= 200 && status < 300
      ? { route, status, ok: true, note: "json ok" }
      : fail(`unexpected status ${status}`);
  }

  const isRedirect = status >= 300 && status < 400;
  if (guarded) {
    if (status === 401 || status === 403) return { route, status, ok: true, note: "auth gate" };
    if (isRedirect) return { route, status, ok: true, note: `redirect -> ${location ?? "?"}` };
  }
  if (status !== 200) return fail(isRedirect ? `unexpected redirect -> ${location ?? "?"}` : `status ${status}`);
  if (looksLikeCrashBody(body)) return fail("SSR crash payload");
  if (body.length < MIN_HTML_BYTES) return fail(`blank response (${body.length} bytes)`);
  if (!/<body[\s>]/i.test(body)) return fail("no HTML document returned");
  return { route, status, ok: true, note: `${body.length} bytes` };
}

/** Human-readable report used in the console and in the alert email/SMS. */
export function summarizeSmoke(results: SmokeOutcome[], baseUrl: string): string {
  const failures = results.filter((r) => !r.ok);
  const lines = [
    `Smoke test ${failures.length === 0 ? "PASSED" : "FAILED"} — ${results.length - failures.length}/${results.length} routes ok`,
    `Target: ${baseUrl}`,
    `Checked: ${new Date().toISOString()}`,
  ];
  if (failures.length) {
    lines.push("", "Failures:");
    for (const f of failures) lines.push(`  ${f.route} -> ${f.status ?? "no response"} (${f.note})`);
  }
  return lines.join("\n");
}
