import { describe, expect, it } from "vitest";

import { collectRoutes } from "../../scripts/smoke-test";
import { verifyStartupHealth } from "@/lib/startup-health";
import { buildRollbackChecklist, renderRollbackChecklistMarkdown } from "@/lib/rollback-checklist";

const SAMPLE = `
  path: '/',
  path: '/services',
  path: '/admin/crm/',
  path: '/review/$token',
  path: '/api/public/health',
  path: '',
`;

describe("smoke test route collection", () => {
  it("includes static site and CRM routes, skips params and api routes", () => {
    const routes = collectRoutes(SAMPLE);
    expect(routes).toContain("/");
    expect(routes).toContain("/services");
    expect(routes).toContain("/admin/crm");
    expect(routes).not.toContain("/review/$token");
    expect(routes).not.toContain("/api/public/health");
  });
});

describe("startup health check", () => {
  const base = {
    createStart: () => {},
    createMiddleware: () => {},
    attachSupabaseAuth: () => {},
    renderErrorPage: () => {},
  };

  it("reports ok when every dependency is present", () => {
    expect(verifyStartupHealth(base).status).toBe("ok");
  });

  it("fails when a required dependency is missing", () => {
    const health = verifyStartupHealth({ ...base, renderErrorPage: undefined });
    expect(health.status).toBe("failed");
  });
});

describe("rollback checklist", () => {
  const pings = [
    { checkedAt: "2026-08-06T12:00:00Z", status: "failed" as const, bootId: "bad2", failed: ["renderErrorPage"] },
    { checkedAt: "2026-08-06T11:00:00Z", status: "failed" as const, bootId: "bad1", failed: ["renderErrorPage"] },
    { checkedAt: "2026-08-06T10:00:00Z", status: "ok" as const, bootId: "good", failed: [] },
  ];

  it("stays quiet when nothing is failing", () => {
    const c = buildRollbackChecklist([pings[2]!], []);
    expect(c.triggered).toBe(false);
    expect(c.steps).toHaveLength(0);
  });

  it("points at the last healthy build when checks fail", () => {
    const c = buildRollbackChecklist(pings, ["renderErrorPage"]);
    expect(c.triggered).toBe(true);
    expect(c.lastGood?.bootId).toBe("good");
    expect(c.firstBad?.bootId).toBe("bad1");
    expect(c.steps.join(" ")).toContain("History tab");
  });

  it("renders markdown for the CLI", () => {
    const md = renderRollbackChecklistMarkdown(buildRollbackChecklist(pings, ["x"]));
    expect(md).toContain("# Rollback checklist");
    expect(md).toContain("1.");
  });
});
