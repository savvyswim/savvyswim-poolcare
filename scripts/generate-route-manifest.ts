// Runs before `vite dev` and `vite build` (predev/prebuild hooks).
// Reads the router-generated src/routeTree.gen.ts (plus the route files themselves)
// and writes a plain runtime manifest to src/lib/route-manifest.gen.ts, so the
// canary and other health checks can never drift from what is actually served.

import { readdirSync, readFileSync, statSync, writeFileSync } from "fs";
import { join, resolve } from "path";

const ROUTES_DIR = resolve(process.cwd(), "src/routes");
const ROUTE_TREE = resolve(process.cwd(), "src/routeTree.gen.ts");
const OUT = resolve(process.cwd(), "src/lib/route-manifest.gen.ts");

export function parseFullPaths(source: string): string[] {
  const block = source.match(/export interface FileRoutesByFullPath \{([\s\S]*?)\n\}/);
  if (!block?.[1]) throw new Error("Could not find FileRoutesByFullPath in routeTree.gen.ts");
  const paths = Array.from(block[1].matchAll(/^\s*'([^']+)':/gm))
    .map((match) => match[1])
    .filter((path): path is string => Boolean(path));
  if (paths.length === 0) throw new Error("No routes parsed from routeTree.gen.ts");
  return Array.from(new Set(paths)).sort();
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

/** Route files whose loader throws a redirect. The canary must expect a 3xx there. */
export function findRedirectRoutes(dir: string = ROUTES_DIR): string[] {
  const found = walk(dir)
    .filter((file) => /\.tsx?$/.test(file))
    .flatMap((file) => {
      const source = readFileSync(file, "utf8");
      if (!/throw redirect\(/.test(source)) return [];
      const declared = source.match(/createFileRoute\(\s*["']([^"']+)["']\s*\)/);
      return declared?.[1] ? [declared[1]] : [];
    });
  return Array.from(new Set(found)).sort();
}

export function renderManifest(paths: string[], redirects: string[]): string {
  return [
    "// GENERATED FILE. Do not edit.",
    "// Produced by scripts/generate-route-manifest.ts from src/routeTree.gen.ts.",
    "// Every URL this deployment serves, used as the single source of truth for",
    "// canary / smoke monitoring (see src/lib/canary-routes.ts).",
    "",
    "export const ROUTE_MANIFEST = [",
    ...paths.map((path) => `  ${JSON.stringify(path)},`),
    "] as const;",
    "",
    "/** Routes whose loader intentionally responds with a 301/302. */",
    "export const REDIRECT_ROUTES = [",
    ...redirects.map((path) => `  ${JSON.stringify(path)},`),
    "] as const;",
    "",
    "export type DeployedRoute = (typeof ROUTE_MANIFEST)[number];",
    "",
  ].join("\n");
}

export function buildManifest(): string {
  return renderManifest(parseFullPaths(readFileSync(ROUTE_TREE, "utf8")), findRedirectRoutes());
}

function main() {
  const contents = buildManifest();
  let previous = "";
  try {
    previous = readFileSync(OUT, "utf8");
  } catch {
    /* first run */
  }
  if (previous !== contents) {
    writeFileSync(OUT, contents);
    console.log(`Route manifest written: ${OUT}`);
  }
}

if (process.argv[1]?.includes("generate-route-manifest")) main();
