import { describe, expect, it } from "vitest";

import { buildSmokeTargets, evaluateSmokeProbe, summarizeSmoke } from "@/lib/smoke";
import { isGuardedRoute } from "@/lib/canary-routes";

const HTML = `<!doctype html><html><body>${"x".repeat(800)}</body></html>`;

describe("generated smoke targets", () => {
  it("derives targets from the generated route manifest", () => {
    const targets = buildSmokeTargets();
    expect(targets.length).toBeGreaterThan(5);
    expect(targets.map((t) => t.route)).toContain("/");
    expect(targets.every((t) => !t.route.includes("$"))).toBe(true);
    for (const t of targets) expect(t.guarded).toBe(isGuardedRoute(t.route));
  });

  it("fast mode probes a smaller, high-value subset", () => {
    const fast = buildSmokeTargets("fast");
    expect(fast.length).toBeGreaterThan(0);
    expect(fast.length).toBeLessThanOrEqual(buildSmokeTargets().length);
  });
});

describe("smoke probe grading", () => {
  const base = { route: "/", guarded: false, body: HTML };

  it("passes a rendered public page", () => {
    expect(evaluateSmokeProbe({ ...base, status: 200 }).ok).toBe(true);
  });

  it("fails a 500, a blank shell and an SSR crash payload", () => {
    expect(evaluateSmokeProbe({ ...base, status: 500 }).ok).toBe(false);
    expect(evaluateSmokeProbe({ ...base, status: 200, body: "<body></body>" }).ok).toBe(false);
    expect(evaluateSmokeProbe({ ...base, status: 200, body: `${HTML}"unhandled":true` }).ok).toBe(false);
  });

  it("fails a network error", () => {
    expect(evaluateSmokeProbe({ ...base, status: null, body: "", error: "timeout" }).ok).toBe(false);
  });

  it("accepts auth gates only for guarded routes", () => {
    const guarded = { route: "/admin/canary", guarded: true, body: "" };
    expect(evaluateSmokeProbe({ ...guarded, status: 401 }).ok).toBe(true);
    expect(evaluateSmokeProbe({ ...guarded, status: 302, location: "/auth" }).ok).toBe(true);
    expect(evaluateSmokeProbe({ ...base, status: 302, location: "/auth" }).ok).toBe(false);
  });

  it("grades api endpoints on status alone", () => {
    expect(evaluateSmokeProbe({ route: "/api/public/health", guarded: false, status: 200, body: "", json: true }).ok).toBe(true);
    expect(evaluateSmokeProbe({ route: "/api/public/health", guarded: false, status: 503, body: "", json: true }).ok).toBe(false);
  });
});

describe("smoke summary", () => {
  it("lists failing routes for the alert payload", () => {
    const summary = summarizeSmoke(
      [
        { route: "/", status: 200, ok: true, note: "ok" },
        { route: "/services", status: 500, ok: false, note: "status 500" },
      ],
      "https://savvyswim.com",
    );
    expect(summary).toContain("FAILED");
    expect(summary).toContain("/services -> 500");
  });
});
