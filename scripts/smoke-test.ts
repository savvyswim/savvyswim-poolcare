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
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

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
    if (!route.startsWith("/")) continue;
    if (route.includes("$")) continue; // dynamic params — no safe fixture
    if (route.startsWith("/api/")) continue; // exercised separately
    found.add(route.length > 1 ? route.replace(/\/$/, "") : "/");
  }
  return [...found].sort();
}

type Result = { route: string; status: number | null; ok: boolean; note: string };

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
  console.log(`Smoke testing ${routes.length + 1} endpoints against ${BASE_URL}\n`);

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
    process.exit(1);
  }
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (isDirectRun) {
  void main();
}
