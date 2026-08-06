import { describe, expect, it } from "vitest";

import { collectRoutes } from "../../scripts/smoke-test";
import { verifyStartupHealth } from "@/lib/startup-health";

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
    createCsrfMiddleware: () => {},
    attachSupabaseAuth: () => {},
    renderErrorPage: () => {},
  };

  it("reports ok when every dependency is present", () => {
    expect(verifyStartupHealth(base).status).toBe("ok");
  });

  it("degrades (does not throw) when createCsrfMiddleware is missing", () => {
    const health = verifyStartupHealth({ ...base, createCsrfMiddleware: undefined });
    expect(health.status).toBe("degraded");
    expect(health.checks.find((c) => c.name === "createCsrfMiddleware")?.ok).toBe(false);
  });

  it("fails when a required dependency is missing", () => {
    const health = verifyStartupHealth({ ...base, renderErrorPage: undefined });
    expect(health.status).toBe("failed");
  });
});
