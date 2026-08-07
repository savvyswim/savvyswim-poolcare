import { describe, expect, it } from "vitest";

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
      target: "https://savvyswim.com",
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
          url: "https://savvyswim.com/",
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
