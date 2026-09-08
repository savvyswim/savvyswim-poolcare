/**
 * Rollback checklist.
 *
 * Pure helpers shared by the deploy smoke test (scripts/smoke-test.ts) and the
 * in-app Deploy Health screen (/admin/crm/deploy-health). When a smoke test or
 * health ping fails, this produces the exact "restore this version" steps
 * instead of leaving you guessing in the deployment history.
 */

export type DeployPing = {
  /** ISO timestamp of the ping. */
  checkedAt: string;
  status: "ok" | "degraded" | "failed";
  /** Server isolate id reported by /api/public/health for that ping. */
  bootId: string | null;
  /** Dependencies / routes that failed on that ping. */
  failed: string[];
};

export type RollbackChecklist = {
  triggered: boolean;
  headline: string;
  /** The last ping that was fully healthy, if we have one. */
  lastGood: DeployPing | null;
  /** The first ping that started failing (the suspect deploy). */
  firstBad: DeployPing | null;
  steps: string[];
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

/**
 * @param pings Newest-first history of health pings / smoke runs.
 * @param failures Names of currently failing checks or routes.
 */
export function buildRollbackChecklist(pings: DeployPing[], failures: string[]): RollbackChecklist {
  const failing = failures.length > 0 || pings[0]?.status === "failed";
  const lastGood = pings.find((p) => p.status === "ok") ?? null;

  // The first bad ping is the newest one that came after the last good ping.
  const goodIndex = lastGood ? pings.indexOf(lastGood) : pings.length;
  const firstBad = goodIndex > 0 ? (pings[goodIndex - 1] ?? null) : null;

  if (!failing) {
    return {
      triggered: false,
      headline: "All checks passing. no rollback needed.",
      lastGood,
      firstBad: null,
      steps: [],
    };
  }

  const steps: string[] = [];
  steps.push(
    failures.length
      ? `Confirm the failure: ${failures.slice(0, 6).join(", ")}${failures.length > 6 ? `, +${failures.length - 6} more` : ""}.`
      : "Confirm the failure: /api/public/health is not returning 200.",
  );
  steps.push("Re-run `bun run test:smoke` against the published URL to rule out a transient blip.");

  if (lastGood) {
    steps.push(
      `Open the Lovable History tab and find the version published just before ${when(lastGood.checkedAt)}. that build (boot id ${lastGood.bootId ?? "unknown"}) was the last one to pass every check.`,
    );
    steps.push(`Restore that version. Anything published after ${when(lastGood.checkedAt)} is suspect.`);
  } else {
    steps.push(
      "No healthy ping is on record yet, so restore the most recent version you know rendered pages, then re-run the smoke test.",
    );
  }

  if (firstBad) {
    steps.push(
      `The break first appeared at ${when(firstBad.checkedAt)} (boot id ${firstBad.bootId ?? "unknown"}), review the edits made right before it.`,
    );
  }

  steps.push("After restoring, re-run `BASE_URL=https://savvyswimservices.com bun run test:smoke` and confirm 200s.");
  steps.push("Then fix forward on the broken change and publish again.");

  return {
    triggered: true,
    headline: lastGood
      ? `Roll back to the build published before ${when(lastGood.checkedAt)}`
      : "Roll back to the last version you know worked",
    lastGood,
    firstBad,
    steps,
  };
}

/** Markdown rendering used by the smoke-test CLI. */
export function renderRollbackChecklistMarkdown(checklist: RollbackChecklist): string {
  const lines = [`# Rollback checklist`, ``, `**${checklist.headline}**`, ``];
  checklist.steps.forEach((s, i) => lines.push(`${i + 1}. ${s}`));
  lines.push("", `_Generated ${new Date().toISOString()}_`);
  return lines.join("\n");
}
