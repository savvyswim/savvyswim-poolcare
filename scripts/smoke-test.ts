/**
 * End-to-end SSR smoke test.
 *
 * Hits every static route (public site + CRM/admin) plus the startup health
 * endpoint and asserts each responds successfully. Run after every deploy:
 *
 *   bun run test:smoke                       # defaults to http://localhost:8080
 *   BASE_URL=https://savvyswim.com bun run test:smoke
 *
 * Exits non-zero when any route fails, so CI/deploy hooks can gate on it.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { buildRollbackChecklist, renderRollbackChecklistMarkdown } from "../src/lib/rollback-checklist";

const BASE_URL = (process.env["BASE_URL"] ?? "http://localhost:8080").replace(/\/$/, "");
const TIMEOUT_MS = Number(process.env["SMOKE_TIMEOUT_MS"] ?? 20000);

const here = path.dirname(fileURLToPath(import.meta.url));
const routeTreePath = path.resolve(here, "../src/routeTree.gen.ts");

/** Auth-guarded routes may legitimately redirect to a login screen. */
const ALLOW_REDIRECT = /^\/(admin|crm|portal)/;

export function collectRoutes(routeTreeSource: string): string[] {
  const found = new Set<string>();
  const re = /path:\s*'([^']+)'/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(routeTreeSource)) !== null) {
    const route = match[1];
    if (!route || !route.startsWith("/")) continue;
    if (route.includes("$")) continue; // dynamic params — no safe fixture
    if (route.startsWith("/api/")) continue; // exercised separately
    found.add(route.length > 1 ? route.replace(/\/$/, "") : "/");
  }

  return [...found].sort();
}

type Result = { route: string; status: number | null; ok: boolean; note: string };

/** Admin/CRM screens that must SSR a real page (200, non-blank, no crash body). */
const CRITICAL_ADMIN_ROUTES = [
  "/admin/crm",
  "/admin/crm/customers",
  "/admin/crm/jobs",
  "/admin/crm/finance",
  "/admin/crm/pipeline",
  "/admin/crm/projects",
  "/admin/crm/reports",
  "/admin/crm/settings",
  "/admin/crm/deploy-health",
  "/portal",
];

const MIN_HTML_BYTES = 500;

function looksLikeCrash(body: string): boolean {
  return body.includes('"unhandled":true') || body.includes("HTTPError");
}

async function probe(route: string): Promise<Result> {
  const url = `${BASE_URL}${route}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { redirect: "manual", signal: controller.signal });
    const isRedirect = res.status >= 300 && res.status < 400;
    const ok = res.status === 200 || (isRedirect && ALLOW_REDIRECT.test(route));
    return {
      route,
      status: res.status,
      ok,
      note: ok && isRedirect ? `redirect -> ${res.headers.get("location") ?? "?"}` : "",
    };
  } catch (error) {
    return {
      route,
      status: null,
      ok: false,
      note: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Critical admin/CRM screens: must be 200 (no redirect away), must return real
 * HTML, and must not be the SSR crash payload or a blank shell.
 */
async function probeCritical(route: string): Promise<Result> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${route}`, { redirect: "manual", signal: controller.signal });
    const body = await res.text();
    if (res.status !== 200) {
      const dest = res.headers.get("location");
      return {
        route: `${route} [critical]`,
        status: res.status,
        ok: false,
        note: dest ? `redirected to ${dest} instead of rendering` : "did not return 200",
      };
    }
    if (looksLikeCrash(body)) {
      return { route: `${route} [critical]`, status: 200, ok: false, note: "SSR crash payload" };
    }
    if (body.length < MIN_HTML_BYTES) {
      return { route: `${route} [critical]`, status: 200, ok: false, note: `blank response (${body.length} bytes)` };
    }
    if (!/<body[\s>]/i.test(body)) {
      return { route: `${route} [critical]`, status: 200, ok: false, note: "no HTML document returned" };
    }
    return { route: `${route} [critical]`, status: 200, ok: true, note: `${body.length} bytes` };
  } catch (error) {
    return {
      route: `${route} [critical]`,
      status: null,
      ok: false,
      note: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timer);
  }
}

/** Unknown URLs must render the branded not-found/error page, not a blank 500. */
async function probeErrorPage(): Promise<Result> {
  const route = "/__smoke__/this-route-does-not-exist";
  try {
    const res = await fetch(`${BASE_URL}${route}`, { redirect: "manual" });
    const body = await res.text();
    const rendered =
      body.length > 200 &&
      /<body[\s>]/i.test(body) &&
      !looksLikeCrash(body) &&
      /(404|not found|page|savvy)/i.test(body);
    return {
      route: "error page (unknown URL)",
      status: res.status,
      ok: (res.status === 404 || res.status === 200) && rendered,
      note: rendered ? `rendered ${body.length} bytes` : "did not render an error page",
    };
  } catch (error) {
    return {
      route: "error page (unknown URL)",
      status: null,
      ok: false,
      note: error instanceof Error ? error.message : String(error),
    };
  }
}

async function probeHealth(): Promise<Result> {
  const route = "/api/public/health";
  try {
    const res = await fetch(`${BASE_URL}${route}`);
    const body = (await res.json()) as { status?: string; checks?: { name: string; ok: boolean; required: boolean; detail: string }[] };
    const failed = (body.checks ?? []).filter((c) => !c.ok);
    return {
      route,
      status: res.status,
      ok: res.status === 200 && body.status !== "failed",
      note: failed.length ? failed.map((c) => `${c.name}: ${c.detail}`).join("; ") : `status=${body.status}`,
    };
  } catch (error) {
    return { route, status: null, ok: false, note: error instanceof Error ? error.message : String(error) };
  }
}

async function main() {
  const routes = collectRoutes(readFileSync(routeTreePath, "utf8"));
  const total = routes.length + CRITICAL_ADMIN_ROUTES.length + 2;
  console.log(`Smoke testing ${total} endpoints against ${BASE_URL}\n`);

  const results: Result[] = [];
  const queue = [...routes];
  const CONCURRENCY = 6;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        results.push(await probe(next));
      }
    }),
  );
  for (const route of CRITICAL_ADMIN_ROUTES) results.push(await probeCritical(route));
  results.push(await probeErrorPage());
  results.push(await probeHealth());
  results.sort((a, b) => a.route.localeCompare(b.route));

  for (const r of results) {
    const mark = r.ok ? "PASS" : "FAIL";
    console.log(`${mark}  ${String(r.status ?? "ERR").padEnd(3)}  ${r.route}${r.note ? `  (${r.note})` : ""}`);
  }

  const failures = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failures.length}/${results.length} passed`);
  if (failures.length) {
    console.error(`\n${failures.length} endpoint(s) failed:`);
    for (const f of failures) console.error(`  ${f.route} -> ${f.status ?? "no response"} ${f.note}`);

    // Failing smoke test -> emit the rollback checklist so you know exactly
    // which version to restore from the deployment history.
    const checklist = buildRollbackChecklist(
      [{ checkedAt: new Date().toISOString(), status: "failed", bootId: null, failed: failures.map((f) => f.route) }],
      failures.map((f) => f.route),
    );
    const markdown = renderRollbackChecklistMarkdown(checklist);
    console.error(`\n${markdown}\n`);
    try {
      mkdirSync(path.resolve(here, "../.lovable"), { recursive: true });
      writeFileSync(path.resolve(here, "../.lovable/rollback-checklist.md"), markdown);
      console.error("Checklist written to .lovable/rollback-checklist.md (also shown in CRM > Deploy Health).");
    } catch {
      /* non-fatal */
    }
    process.exit(1);
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  void main();
}
