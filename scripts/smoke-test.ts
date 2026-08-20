/**
 * Automated smoke test over the GENERATED canary routes.
 *
 * Route list comes from src/lib/route-manifest.gen.ts (via canary-routes), so
 * it always matches what the router serves. Adds the branded error page and the
 * startup health endpoint. Fails the process and pages on-call on any failure:
 *
 *   bun run test:smoke                       # defaults to http://localhost:8080
 *   BASE_URL=https://savvyswimservices.com bun run test:smoke
 *   bun run test:smoke -- --fast             # highest-value routes only
 *
 * Alerting: with OPS_HOOK_SECRET set, failures POST to
 * /api/public/hooks/smoke-alert which emails + texts on-call.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { buildRollbackChecklist, renderRollbackChecklistMarkdown } from "../src/lib/rollback-checklist";
import { buildSmokeTargets, evaluateSmokeProbe, summarizeSmoke } from "../src/lib/smoke";

const BASE_URL = (process.env["BASE_URL"] ?? "http://localhost:8080").replace(/\/$/, "");
const TIMEOUT_MS = Number(process.env["SMOKE_TIMEOUT_MS"] ?? 20000);

const here = path.dirname(fileURLToPath(import.meta.url));



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

function looksLikeCrash(body: string): boolean {
  return body.includes('"unhandled":true') || body.includes("HTTPError");
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

/** Probe one generated canary route and grade it with the shared rules. */
async function probeTarget(target: { route: string; guarded: boolean }): Promise<Result> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE_URL}${target.route}`, { redirect: "manual", signal: controller.signal });
    const json = target.route.startsWith("/api/");
    const body = json ? "" : await res.text();
    return evaluateSmokeProbe({
      route: target.route,
      guarded: target.guarded,
      status: res.status,
      body,
      location: res.headers.get("location"),
      json,
    });
  } catch (error) {
    return evaluateSmokeProbe({
      route: target.route,
      guarded: target.guarded,
      status: null,
      body: "",
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    clearTimeout(timer);
  }
}

/** Page on-call when the smoke run fails (no-op unless the hook secret is set). */
async function alertOnFailure(failures: Result[], summary: string) {
  const secret = process.env["OPS_HOOK_SECRET"] ?? process.env["CRM_WEBHOOK_SECRET"];
  if (!secret) {
    console.error("Alert skipped: OPS_HOOK_SECRET not set in this environment.");
    return;
  }
  const alertBase = (process.env["SMOKE_ALERT_URL"] ?? "https://savvyswimservices.com").replace(/\/$/, "");
  try {
    const res = await fetch(`${alertBase}/api/public/hooks/smoke-alert`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-ops-secret": secret },
      body: JSON.stringify({
        target: BASE_URL,
        summary,
        failures: failures.map((f) => ({ route: f.route, status: f.status, note: f.note })),
      }),
    });
    console.error(`Alert dispatch: ${res.status} ${await res.text()}`);
  } catch (error) {
    console.error("Alert dispatch failed:", error instanceof Error ? error.message : String(error));
  }
}

async function main() {
  const mode = process.argv.includes("--fast") || process.env["SMOKE_MODE"] === "fast" ? "fast" : "full";
  const targets = buildSmokeTargets(mode);
  console.log(`Smoke testing ${targets.length + 2} endpoints (${mode}, generated canary routes) against ${BASE_URL}\n`);

  const results: Result[] = [];
  const queue = [...targets];
  const CONCURRENCY = 6;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let next = queue.shift(); next; next = queue.shift()) {
        results.push(await probeTarget(next));
      }
    }),
  );
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
