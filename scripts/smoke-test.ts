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

import { buildRollbackChecklist, renderRollbackChecklistMarkdown } from "./src/lib/rollback-checklist";
import { buildSmokeTargets, evaluateSmokeProbe, summarizeSmoke } from "./src/lib/smoke";

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
    if (route.includes("$")) continue; // dynamic params. no safe fixture
    if (route.startsWith("/api/")) continue; // exercised separately
    found.add(route.length > 1 ? route.replace(/\/$/, "") : "/");
  }

  return [..found].sort();
}

type Result = { route: string; status: number | null; ok: boolean; note: string };

/** Captured evidence for a failed route, written to .lovable/smoke-artifacts/. */
type Artifact = {
  route: string;
  url: string;
  status: number | null;
  statusText?: string;
  note: string;
  headers?: Record<string, string>;
  bodySnippet?: string;
  bodyBytes?: number;
  error?: string;
  capturedAt: string;
};

const artifacts: Artifact[] = [];

/** Redact anything that could carry a session or secret out of CI logs. */
const SENSITIVE_HEADER = /^(set-cookie|cookie|authorization|x-api-key|apikey|x-ops-secret)$/i;

function collectHeaders(res: Response): Record<string, string> {
  const out: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    out[key] = SENSITIVE_HEADER.test(key) ? "[redacted]" : value;
  });
  return out;
}

function recordArtifact(a: Artifact) {
  artifacts.push(a);
}

function slugify(route: string): string {
  return route.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "root";
}

/** Write one file per failed route plus a combined index. */
function writeArtifacts(): string | null {
  if (artifacts.length === 0) return null;
  const dir = path.resolve(here, "./.lovable/smoke-artifacts");
  try {
    mkdirSync(dir, { recursive: true });
    for (const a of artifacts) {
      writeFileSync(path.join(dir, `${slugify(a.route)}.json`), JSON.stringify(a, null, 2));
      if (a.bodySnippet) writeFileSync(path.join(dir, `${slugify(a.route)}.body.html`), a.bodySnippet);
    }
    writeFileSync(path.join(dir, "index.json"), JSON.stringify({ baseUrl: BASE_URL, failures: artifacts }, null, 2));
    return dir;
  } catch (error) {
    console.error("Could not write smoke artifacts:", error instanceof Error ? error.message : String(error));
    return null;
  }
}

function looksLikeCrash(body: string): boolean {
  return body.includes('"unhandled":true') || body.includes("HTTPError");
}



const BODY_SNIPPET_BYTES = Number(process.env["SMOKE_SNIPPET_BYTES"] ?? 20000);

/** Unknown URLs must render the branded not-found/error page, not a blank 500. */
async function probeErrorPage(): Promise<Result> {
  const route = "/__smoke__/this-route-does-not-exist";
  const url = `${BASE_URL}${route}`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    const body = await res.text();
    const rendered =
      body.length > 200 &&
      /<body[\s>]/i.test(body) &&
      !looksLikeCrash(body) &&
      /(404|not found|page|savvy)/i.test(body);
    const result: Result = {
      route: "error page (unknown URL)",
      status: res.status,
      ok: (res.status === 404 || res.status === 200) && rendered,
      note: rendered ? `rendered ${body.length} bytes` : "did not render an error page",
    };
    if (!result.ok) {
      recordArtifact({
        route: result.route,
        url,
        status: res.status,
        statusText: res.statusText,
        note: result.note,
        headers: collectHeaders(res),
        bodySnippet: body.slice(0, BODY_SNIPPET_BYTES),
        bodyBytes: body.length,
        capturedAt: new Date().toISOString(),
      });
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    recordArtifact({ route: "error page (unknown URL)", url, status: null, note: message, error: message, capturedAt: new Date().toISOString() });
    return { route: "error page (unknown URL)", status: null, ok: false, note: message };
  }
}

async function probeHealth(): Promise<Result> {
  const route = "/api/public/health";
  const url = `${BASE_URL}${route}`;
  try {
    const res = await fetch(url);
    const raw = await res.text();
    let body: { status?: string; checks?: { name: string; ok: boolean; required: boolean; detail: string }[] } = {};
    try {
      body = JSON.parse(raw);
    } catch {
      /* non-JSON body is itself a failure signal */
    }
    const failed = (body.checks ?? []).filter((c) => !c.ok);
    const result: Result = {
      route,
      status: res.status,
      ok: res.status === 200 && body.status !== "failed" && body.status !== undefined,
      note: failed.length ? failed.map((c) => `${c.name}: ${c.detail}`).join("; ") : `status=${body.status}`,
    };
    if (!result.ok) {
      recordArtifact({
        route,
        url,
        status: res.status,
        statusText: res.statusText,
        note: result.note,
        headers: collectHeaders(res),
        bodySnippet: raw.slice(0, BODY_SNIPPET_BYTES),
        bodyBytes: raw.length,
        capturedAt: new Date().toISOString(),
      });
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    recordArtifact({ route, url, status: null, note: message, error: message, capturedAt: new Date().toISOString() });
    return { route, status: null, ok: false, note: message };
  }
}

/** Probe one generated canary route and grade it with the shared rules. */
async function probeTarget(target: { route: string; guarded: boolean; redirects?: boolean }): Promise<Result> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const url = `${BASE_URL}${target.route}`;
  try {
    const res = await fetch(url, { redirect: "manual", signal: controller.signal });
    const json = target.route.startsWith("/api/");
    const raw = await res.text();
    const body = json ? "" : raw;
    const result = evaluateSmokeProbe({
      route: target.route,
      guarded: target.guarded,
      redirects: target.redirects ?? false,
      status: res.status,
      body,
      location: res.headers.get("location"),
      json,
    });
    if (!result.ok) {
      recordArtifact({
        route: target.route,
        url,
        status: res.status,
        statusText: res.statusText,
        note: result.note,
        headers: collectHeaders(res),
        bodySnippet: raw.slice(0, BODY_SNIPPET_BYTES),
        bodyBytes: raw.length,
        capturedAt: new Date().toISOString(),
      });
    }
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    recordArtifact({ route: target.route, url, status: null, note: message, error: message, capturedAt: new Date().toISOString() });
    return evaluateSmokeProbe({
      route: target.route,
      guarded: target.guarded,
      status: null,
      body: "",
      error: message,
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
  const queue = [..targets];
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

    const artifactDir = writeArtifacts();
    if (artifactDir) {
      console.error(`\nCaptured response headers + body snippets for ${artifacts.length} failed route(s) in .lovable/smoke-artifacts/`);
    }

    await alertOnFailure(failures, summarizeSmoke(results, BASE_URL));




    // Failing smoke test -> emit the rollback checklist so you know exactly
    // which version to restore from the deployment history.
    const checklist = buildRollbackChecklist(
      [{ checkedAt: new Date().toISOString(), status: "failed", bootId: null, failed: failures.map((f) => f.route) }],
      failures.map((f) => f.route),
    );
    const markdown = renderRollbackChecklistMarkdown(checklist);
    console.error(`\n${markdown}\n`);
    try {
      mkdirSync(path.resolve(here, "./.lovable"), { recursive: true });
      writeFileSync(path.resolve(here, "./.lovable/rollback-checklist.md"), markdown);
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
