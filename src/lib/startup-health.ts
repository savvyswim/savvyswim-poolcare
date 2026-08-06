/**
 * Startup health check.
 *
 * Runs once at server module init (imported from src/start.ts) and verifies
 * that the framework/middleware dependencies the app relies on actually exist
 * in the deployed build. Missing exports (e.g. `createCsrfMiddleware` in older
 * framework builds) used to crash SSR at module init and take down every page;
 * now they are recorded as degraded checks instead, and surfaced through
 * /api/public/health so a deploy smoke test can catch it.
 */

export type HealthCheck = {
  name: string;
  ok: boolean;
  required: boolean;
  detail: string;
};

export type StartupHealth = {
  status: "ok" | "degraded" | "failed";
  checkedAt: string;
  checks: HealthCheck[];
};

let cached: StartupHealth | undefined;

type DependencySpec = {
  name: string;
  required: boolean;
  /** Returns a detail string when healthy, throws or returns false when not. */
  probe: () => boolean;
  optionalNote?: string;
};

function runChecks(deps: DependencySpec[]): StartupHealth {
  const checks: HealthCheck[] = deps.map((dep) => {
    try {
      const ok = dep.probe();
      return {
        name: dep.name,
        ok,
        required: dep.required,
        detail: ok ? "available" : (dep.optionalNote ?? "missing from this build"),
      };
    } catch (error) {
      return {
        name: dep.name,
        ok: false,
        required: dep.required,
        detail: error instanceof Error ? error.message : String(error),
      };
    }
  });

  const failedRequired = checks.some((c) => !c.ok && c.required);
  const failedOptional = checks.some((c) => !c.ok && !c.required);

  return {
    status: failedRequired ? "failed" : failedOptional ? "degraded" : "ok",
    checkedAt: new Date().toISOString(),
    checks,
  };
}

/**
 * Verify server dependencies before the app starts serving traffic.
 * Never throws: a hard throw here would break every request, which is exactly
 * the failure mode this check exists to prevent.
 */
export function verifyStartupHealth(candidates: {
  createStart: unknown;
  createMiddleware: unknown;
  createCsrfMiddleware: unknown;
  attachSupabaseAuth: unknown;
  renderErrorPage: unknown;
}): StartupHealth {
  const health = runChecks([
    {
      name: "createStart",
      required: true,
      probe: () => typeof candidates.createStart === "function",
    },
    {
      name: "createMiddleware",
      required: true,
      probe: () => typeof candidates.createMiddleware === "function",
    },
    {
      name: "createCsrfMiddleware",
      required: false,
      probe: () => typeof candidates.createCsrfMiddleware === "function",
      optionalNote: "not exported by this framework build — CSRF middleware skipped",
    },
    {
      name: "attachSupabaseAuth",
      required: true,
      // Middleware objects are not functions — just require a defined value.
      probe: () =>
        candidates.attachSupabaseAuth != null &&
        ["function", "object"].includes(typeof candidates.attachSupabaseAuth),

    },
    {
      name: "renderErrorPage",
      required: true,
      probe: () => typeof candidates.renderErrorPage === "function",
    },
  ]);

  cached = health;

  for (const check of health.checks) {
    if (check.ok) continue;
    const message = `[startup-health] ${check.name}: ${check.detail}`;
    if (check.required) console.error(message);
    else console.warn(message);
  }

  return health;
}

export function getStartupHealth(): StartupHealth {
  return (
    cached ?? {
      status: "degraded",
      checkedAt: new Date().toISOString(),
      checks: [
        {
          name: "startup-check",
          ok: false,
          required: false,
          detail: "startup health check has not run in this isolate yet",
        },
      ],
    }
  );
}
