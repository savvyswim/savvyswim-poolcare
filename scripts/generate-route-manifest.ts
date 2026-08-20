// Runs before `vite dev` and `vite build` (predev/prebuild hooks).
// Reads the router-generated src/routeTree.gen.ts and writes a plain runtime
// list of every deployed URL to src/lib/route-manifest.gen.ts, so the canary
// (and any other health check) can never drift from what is actually served.

import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const ROUTE_TREE = resolve(process.cwd(), "src/routeTree.gen.ts");
const OUT = resolve(process.cwd(), "src/lib/route-manifest.gen.ts");

export function parseFullPaths(source: string): string[] {
  const block = source.match(/export interface FileRoutesByFullPath \{([\s\S]*?)\n\}/);
  if (!block) throw new Error("Could not find FileRoutesByFullPath in routeTree.gen.ts");
  const paths = Array.from(block[1].matchAll(/^\s*'([^']+)':/gm)).map((m) => m[1]);
  if (paths.length === 0) throw new Error("No routes parsed from routeTree.gen.ts");
  return Array.from(new Set(paths)).sort();
}

export function renderManifest(paths: string[]): string {
  return [
    "// GENERATED FILE — do not edit.",
    "// Produced by scripts/generate-route-manifest.ts from src/routeTree.gen.ts.",
    "// Every URL this deployment serves, used as the single source of truth for",
    "// canary / smoke monitoring (see src/lib/canary-routes.ts).",
    "",
    "export const ROUTE_MANIFEST = [",
    ...paths.map((p) => `  ${JSON.stringify(p)},`),
    "] as const;",
    "",
    "export type DeployedRoute = (typeof ROUTE_MANIFEST)[number];",
    "",
  ].join("\n");
}

function main() {
  const source = readFileSync(ROUTE_TREE, "utf8");
  const contents = renderManifest(parseFullPaths(source));
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
