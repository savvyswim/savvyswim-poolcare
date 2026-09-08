/**
 * Post-deploy canary CLI.
 *
 * Repeatedly hits the deployed site and prints every failing request with the
 * captured stack trace / response snippet. Writes a JSON report to
 * .lovable/canary-report.json and exits non-zero on failure so deploy tooling
 * can gate or roll back.
 *
 *   bun run canary
 *   BASE_URL=https://savvyswim.com CANARY_ROUNDS=5 bun run canary
 */
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runCanary, summarizeCanary } from "../src/lib/canary";

const here = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const target = (process.env["BASE_URL"] ?? "http://localhost:8080").replace(/\/$/, "");
  const rounds = Number(process.env["CANARY_ROUNDS"] ?? 3);
  const delayMs = Number(process.env["CANARY_DELAY_MS"] ?? 1000);

  console.log(`\nCanary → ${target} (${rounds} rounds)\n`);

  const run = await runCanary({ target, rounds, delayMs });

  for (const probe of run.probes) {
    const mark = probe.ok ? "✓" : "✗";
    console.log(
      `${mark} r${probe.round} ${probe.route.padEnd(32)} ${String(probe.httpStatus ?? ", ").padStart(3)}  ${probe.durationMs}ms ${probe.ok ? "" : `, ${probe.kind}: ${probe.message}`}`,
    );
  }

  console.log("\n" + summarizeCanary(run) + "\n");

  const outDir = path.resolve(here, "./.lovable");
  mkdirSync(outDir, { recursive: true });
  writeFileSync(path.join(outDir, "canary-report.json"), JSON.stringify(run, null, 2));
  console.log(`Report: .lovable/canary-report.json`);

  if (run.status === "failed") process.exit(1);
}

void main();
