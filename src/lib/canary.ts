/**
 * Post-deploy canary.
 *
 * Repeatedly hits the deployed site (several rounds over a set of critical
 * routes) and captures everything useful when a request returns 5xx, times
 * out, or renders a crash body: status, timing, response headers, a body
 * snippet and any stack trace embedded in the response.
 *
 * Pure/dependency-free so it can run from a server route, a CLI script, or a
 * unit test.
 */

import { isGuardedRoute, isRedirectRoute, selectCanaryRoutes, selectGuardedRoutes, selectSmokeRoutes } from "./canary-routes";

export type CanaryKind = "ok" | "http_5xx" | "http_4xx" | "timeout" | "network" | "crash_body" | "blank";

export type CanaryProbe = {
  route: string;
  round: number;
  url: string;
  kind: CanaryKind;
  ok: boolean;
  httpStatus: number | null;
  durationMs: number;
  message: string;
  stack: string | null;
  bodySnippet: string | null;
  requestId: string | null;
  revisionId: string | null;
};

export type CanaryRun = {
  target: string;
  startedAt: string;
  finishedAt: string;
  rounds: number;
  requests: number;
  failures: number;
  status: "ok" | "failed";
  slowestMs: number;
  probes: CanaryProbe[];
  incidents: CanaryProbe[];
  revisionId: string | null;
};

// Derived from the router's own route tree (src/lib/route-manifest.gen.ts) via
// src/lib/canary-routes.ts, so the monitored list can never drift from what the
// deployment actually serves. The CRM / customer app lives in a separate project
// (see src/lib/app-links.ts) and therefore never appears here.
export const DEFAULT_CANARY_ROUTES = selectCanaryRoutes();

export const SMOKE_ROUTES = selectSmokeRoutes();

/** Auth-gated pages that are still monitored (a sign-in challenge counts as healthy). */
export const GUARDED_CANARY_ROUTES = selectGuardedRoutes();

const BODY_SNIPPET_LIMIT = 1200;
const MIN_HTML_BYTES = 500;

/** A 3xx is expected on guarded areas and on routes the manifest marks as redirects. */
const redirectAllowed = (route: string) => isGuardedRoute(route) || isRedirectRoute(route);

/**
 * Auth-gated pages we do serve: a sign-in challenge is healthy, a missing page
 * or a server error is not. Everything else keeps the strict rules.
 */
const AUTH_CHALLENGE_STATUSES = new Set([401, 403]);

export function looksLikeCrashBody(body: string): boolean {
  return body.includes('"unhandled":true') || body.includes('"message":"HTTPError"');
}

/** Pull a stack trace out of an HTML/JSON error response when the server leaked one. */
export function extractStack(body: string): string | null {
  const match = body.match(/(?:^|\n|>)\s*([A-Za-z_$][\w$]*Error: [^\n<]{1,200}(?:\n\s+at [^\n<]{1,300}){1,20})/);
  return match?.[1]?.trim() ?? null;
}

async function fingerprint(body: string): Promise<string | null> {
  if (!body) return null;
  const bytes = new TextEncoder().encode(body);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).slice(0, 8).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function classify(input: {
  route: string;
  httpStatus: number | null;
  body: string;
  aborted: boolean;
  networkError: string | null;
}): { kind: CanaryKind; ok: boolean; message: string } {
  const { route, httpStatus, body, aborted, networkError } = input;
  if (aborted) return { kind: "timeout", ok: false, message: "request timed out" };
  if (networkError) return { kind: "network", ok: false, message: networkError };
  if (httpStatus !== null && httpStatus >= 500)
    return { kind: "http_5xx", ok: false, message: `server error ${httpStatus}` };
  if (looksLikeCrashBody(body))
    return { kind: "crash_body", ok: false, message: "SSR crash body returned" };
  if (httpStatus !== null && isGuardedRoute(route) && AUTH_CHALLENGE_STATUSES.has(httpStatus))
    return { kind: "ok", ok: true, message: "" };
  if (httpStatus !== null && httpStatus >= 400)
    return { kind: "http_4xx", ok: false, message: `client error ${httpStatus}` };
  const isRedirect = httpStatus !== null && httpStatus >= 300 && httpStatus < 400;
  if (isRedirect && !redirectAllowed(route))
    return { kind: "http_4xx", ok: false, message: `unexpected redirect ${httpStatus}` };
  if (!isRedirect && !route.startsWith("/api/") && body.length < MIN_HTML_BYTES)
    return { kind: "blank", ok: false, message: `blank response (${body.length} bytes)` };
  return { kind: "ok", ok: true, message: "" };
}

async function probeOnce(
  target: string,
  route: string,
  round: number,
  timeoutMs: number,
): Promise<CanaryProbe> {
  const url = `${target}${route}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();

  let httpStatus: number | null = null;
  let body = "";
  let aborted = false;
  let networkError: string | null = null;
  let requestId: string | null = null;
  let revisionId: string | null = null;

  try {
    const res = await fetch(url, {
      redirect: "manual",
      signal: controller.signal,
      headers: { "cache-control": "no-cache", "x-savvy-canary": "1" },
    });
    httpStatus = res.status;
    body = await res.text().catch(() => "");
    requestId = res.headers.get("cf-ray") ?? res.headers.get("x-request-id") ?? res.headers.get("x-correlation-id");
    revisionId = res.headers.get("x-lovable-revision") ?? res.headers.get("etag") ?? await fingerprint(body);
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") aborted = true;
    else networkError = error instanceof Error ? error.message : String(error);
  } finally {
    clearTimeout(timer);
  }

  const durationMs = Date.now() - started;
  const { kind, ok, message } = classify({ route, httpStatus, body, aborted, networkError });

  return {
    route,
    round,
    url,
    kind,
    ok,
    httpStatus,
    durationMs,
    message,
    stack: ok ? null : extractStack(body),
    bodySnippet: ok ? null : body.slice(0, BODY_SNIPPET_LIMIT) || null,
    requestId,
    revisionId,
  };
}

export async function runCanary(options?: {
  target?: string;
  routes?: string[];
  rounds?: number;
  timeoutMs?: number;
  delayMs?: number;
}): Promise<CanaryRun> {
  // Probe the origin that actually serves HTML. The other Savvy Swim domains
  // 302 to this one, which the canary correctly reports as an unexpected
  // redirect on every route.
  const target = (options?.target ?? "https://savvyswim.com").replace(/\/$/, "");
  const routes = options?.routes ?? DEFAULT_CANARY_ROUTES;
  const rounds = Math.max(1, Math.min(options?.rounds ?? 3, 10));
  const timeoutMs = options?.timeoutMs ?? 15000;
  const delayMs = options?.delayMs ?? 1000;

  const startedAt = new Date().toISOString();
  const probes: CanaryProbe[] = [];

  for (let round = 1; round <= rounds; round += 1) {
    for (const route of routes) {
      probes.push(await probeOnce(target, route, round, timeoutMs));
    }
    if (round < rounds && delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  }

  const incidents = probes.filter((p) => !p.ok);

  return {
    target,
    startedAt,
    finishedAt: new Date().toISOString(),
    rounds,
    requests: probes.length,
    failures: incidents.length,
    status: incidents.length === 0 ? "ok" : "failed",
    slowestMs: probes.reduce((max, p) => Math.max(max, p.durationMs), 0),
    probes,
    incidents,
    revisionId: probes.find((probe) => probe.route === "/" && probe.revisionId)?.revisionId ?? null,
  };
}

export function summarizeCanary(run: CanaryRun): string {
  const lines = [
    `Savvy Swim canary: ${run.status.toUpperCase()}`,
    `Target: ${run.target}`,
    `${run.requests} requests over ${run.rounds} round(s), ${run.failures} failing, slowest ${run.slowestMs}ms`,
  ];
  for (const incident of run.incidents.slice(0, 10)) {
    lines.push(
      "",
      `✗ ${incident.route} (round ${incident.round}), ${incident.kind}: ${incident.message} [${incident.durationMs}ms]`,
    );
    if (incident.stack) lines.push(incident.stack);
    else if (incident.bodySnippet) lines.push(incident.bodySnippet.slice(0, 300));
  }
  if (run.failures > 0) {
    lines.push(
      "",
      "Next: open /admin/crm/deploy-health for the captured traces, then restore the last passing version from the Lovable History tab.",
    );
  }
  return lines.join("\n");
}
