import { readFileSync } from "fs";
import { resolve } from "path";

import { describe, expect, it } from "vitest";

import { buildManifest } from "../../scripts/generate-route-manifest";
import { DEFAULT_CANARY_ROUTES, GUARDED_CANARY_ROUTES, SMOKE_ROUTES } from "@/lib/canary";
import { isRedirectRoute, ROUTE_MANIFEST, selectCanaryRoutes } from "@/lib/canary-routes";

import { classify, extractStack, looksLikeCrashBody, summarizeCanary, type CanaryRun } from "@/lib/canary";

describe("canary classification", () => {
  const base = { route: "/", httpStatus: 200, body: "x".repeat(900), aborted: false, networkError: null };

  it("passes a healthy page", () => {
    expect(classify(base).ok).toBe(true);
  });

  it("flags 5xx", () => {
    expect(classify({ ...base, httpStatus: 500 })).toMatchObject({ kind: "http_5xx", ok: false });
  });

  it("flags timeouts", () => {
    expect(classify({ ...base, aborted: true, httpStatus: null })).toMatchObject({ kind: "timeout", ok: false });
  });

  it("flags network errors", () => {
    expect(classify({ ...base, httpStatus: null, networkError: "fetch failed" })).toMatchObject({
      kind: "network",
      ok: false,
    });
  });

  it("flags SSR crash bodies even with a 200", () => {
    expect(classify({ ...base, body: '{"status":500,"unhandled":true,"message":"HTTPError"}' })).toMatchObject({
      kind: "crash_body",
      ok: false,
    });
  });

  it("flags blank pages", () => {
    expect(classify({ ...base, body: "<html></html>" })).toMatchObject({ kind: "blank", ok: false });
  });

  it("allows redirects on guarded areas only", () => {
    expect(classify({ ...base, route: "/admin/crm", httpStatus: 302, body: "" }).ok).toBe(true);
    expect(classify({ ...base, route: "/services", httpStatus: 302, body: "" }).ok).toBe(false);
  });
});

describe("canary trace capture", () => {
  it("detects crash bodies", () => {
    expect(looksLikeCrashBody('{"unhandled":true}')).toBe(true);
    expect(looksLikeCrashBody("<html>ok</html>")).toBe(false);
  });

  it("extracts a stack trace from an error response", () => {
    const body = "TypeError: createCsrfMiddleware is not a function\n    at start (/bundle/server.js:12:3)\n    at fetch (/bundle/server.js:40:5)";
    expect(extractStack(body)).toContain("TypeError: createCsrfMiddleware is not a function");
    expect(extractStack("<html>fine</html>")).toBeNull();
  });

  it("summarizes a failing run with next steps", () => {
    const run: CanaryRun = {
      target: "https://savvyswimservices.com",
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      rounds: 2,
      requests: 4,
      failures: 1,
      status: "failed",
      slowestMs: 900,
      probes: [],
      revisionId: "fixture-revision",
      incidents: [
        {
          route: "/",
          round: 1,
          url: "https://savvyswimservices.com/",
          kind: "http_5xx",
          ok: false,
          httpStatus: 500,
          durationMs: 900,
          message: "server error 500",
          stack: "Error: boom\n    at x",
          bodySnippet: "boom",
          requestId: "fixture-request",
          revisionId: "fixture-revision",
        },
      ],
    };
    const summary = summarizeCanary(run);
    expect(summary).toContain("FAILED");
    expect(summary).toContain("http_5xx");
    expect(summary).toContain("deploy-health");
  });
});

describe("canary route manifest", () => {
  it("stays in sync with the router's generated route tree", () => {
    const expected = buildManifest();
    const actual = readFileSync(resolve(process.cwd(), "src/lib/route-manifest.gen.ts"), "utf8");
    expect(actual).toBe(expected);
  });

  it("only monitors routes that exist in the manifest", () => {
    for (const route of DEFAULT_CANARY_ROUTES) expect(ROUTE_MANIFEST).toContain(route);
    for (const route of SMOKE_ROUTES) expect(DEFAULT_CANARY_ROUTES).toContain(route);
  });

  it("skips auth-gated, parameterised and internal routes", () => {
    expect(DEFAULT_CANARY_ROUTES).toContain("/schedule");
    expect(DEFAULT_CANARY_ROUTES).toContain("/api/public/health");
    expect(DEFAULT_CANARY_ROUTES).not.toContain("/$city");
    expect(DEFAULT_CANARY_ROUTES).not.toContain("/admin/lead-sync");
    expect(DEFAULT_CANARY_ROUTES).not.toContain("/schedule-qr");
    expect(DEFAULT_CANARY_ROUTES).not.toContain("/api/public/leads");
  });

  it("drops a route as soon as it leaves the manifest", () => {
    const shrunk = ROUTE_MANIFEST.filter((path) => path !== "/services");
    expect(selectCanaryRoutes(shrunk)).not.toContain("/services");
  });
});

describe("canary redirect awareness", () => {
  it("accepts a 301 on manifest-declared redirect routes", () => {
    expect(isRedirectRoute("/book")).toBe(true);
    expect(
      classify({ route: "/book", httpStatus: 301, body: "", aborted: false, networkError: null }).ok,
    ).toBe(true);
  });
});

describe("guarded route monitoring", () => {
  it("monitors the staff and customer areas we actually serve", () => {
    expect(DEFAULT_CANARY_ROUTES).toContain("/admin/webhook-health");
    expect(DEFAULT_CANARY_ROUTES).toContain("/portal");
    expect(GUARDED_CANARY_ROUTES).toContain("/admin/not-found");
    expect(GUARDED_CANARY_ROUTES).not.toContain("/schedule");
  });

  it("treats a sign-in challenge or redirect as healthy on guarded routes", () => {
    const guarded = { route: "/admin/webhook-health", body: "", aborted: false, networkError: null };
    expect(classify({ ...guarded, httpStatus: 302 }).ok).toBe(true);
    expect(classify({ ...guarded, httpStatus: 401 }).ok).toBe(true);
    expect(classify({ ...guarded, httpStatus: 403 }).ok).toBe(true);
  });

  it("still fails guarded routes on 404 and 5xx", () => {
    const guarded = { route: "/admin/webhook-health", body: "", aborted: false, networkError: null };
    expect(classify({ ...guarded, httpStatus: 404 })).toMatchObject({ kind: "http_4xx", ok: false });
    expect(classify({ ...guarded, httpStatus: 500 })).toMatchObject({ kind: "http_5xx", ok: false });
  });

  it("does not soften auth statuses on public pages", () => {
    expect(
      classify({ route: "/schedule", httpStatus: 401, body: "", aborted: false, networkError: null }).ok,
    ).toBe(false);
  });
});
