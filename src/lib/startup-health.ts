/**
 * Startup health check.
 *
 * Runs once at server module init (imported from src/start.ts) and verifies
 * that the framework/middleware dependencies the app relies on actually exist
 * in the deployed build. Missing framework exports used to crash SSR at module
 * init and take down every page; required dependencies are now recorded and
 * surfaced through /api/public/health so a deploy smoke test can catch them.
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
  /** Unique per server isolate, lets you tell one boot's logs from another. */
  bootId: string;
  checks: HealthCheck[];
};

let cached: StartupHealth | undefined;

// Server modules are evaluated outside a request in production. Random APIs
// are not allowed during that phase and can prevent the entire worker from
// booting, so keep the startup identifier deterministic and dependency-free.
const BOOT_ID = "server-start";

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
    bootId: BOOT_ID,
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
      name: "attachSupabaseAuth",
      required: true,
      // Middleware objects are not functions. Just require a defined value.
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
  logStartupHealth(health);

  return health;
}

/**
 * One structured JSON line per boot plus one line per failing dependency, so
 * server logs answer "which middleware failed?" without guesswork.
 */
export function logStartupHealth(health: StartupHealth): void {
  const summary = {
    tag: "ssr-boot",
    bootId: health.bootId,
    status: health.status,
    checkedAt: health.checkedAt,
    deps: Object.fromEntries(health.checks.map((c) => [c.name, c.ok ? "ok" : "missing"])),
    failed: health.checks.filter((c) => !c.ok).map((c) => c.name),
  };
  const line = JSON.stringify(summary);
  if (health.status === "failed") console.error(line);
  else if (health.status === "degraded") console.warn(line);
  else console.log(line);

  for (const check of health.checks) {
    if (check.ok) continue;
    const message = JSON.stringify({
      tag: "ssr-boot-dep",
      bootId: health.bootId,
      dep: check.name,
      required: check.required,
      detail: check.detail,
    });
    if (check.required) console.error(message);
    else console.warn(message);
  }
}

export function getStartupHealth(): StartupHealth {
  return (
    cached ?? {
      status: "degraded",
      checkedAt: new Date().toISOString(),
      bootId: BOOT_ID,
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
