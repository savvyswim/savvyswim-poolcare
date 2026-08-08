/**
 * Savvy Swim Signature Service Checklist.
 *
 * Every visit runs these 15 steps in order. `photo` marks the steps where a
 * picture is the proof: "required" blocks completion, "suggested" just offers
 * the camera. Pool-specific tasks from ss_workflow_tasks are appended after.
 */
export type ChecklistPhoto = "required" | "suggested" | "none";

export type ChecklistStep = {
  id: string;
  label: string;
  hint: string;
  is_required: boolean;
  photo: ChecklistPhoto;
};

export const SIGNATURE_CHECKLIST: ChecklistStep[] = [
  {
    id: "sig-01",
    label: "Property check-in",
    hint: "Confirm gate code/access, note pets or obstacles, greet the homeowner if present.",
    is_required: true,
    photo: "none",
  },
  {
    id: "sig-02",
    label: "Safety scan",
    hint: "Gate latch, fencing and drain covers secure before any work starts.",
    is_required: true,
    photo: "suggested",
  },
  {
    id: "sig-03",
    label: "Debris sweep",
    hint: "Skim leaves and surface debris first.",
    is_required: true,
    photo: "none",
  },
  {
    id: "sig-04",
    label: "Basket & skimmer clear-out",
    hint: "Empty and rinse skimmer and pump baskets.",
    is_required: true,
    photo: "suggested",
  },
  {
    id: "sig-05",
    label: "Brush down",
    hint: "Brush walls, steps and corners to stop algae early.",
    is_required: true,
    photo: "none",
  },
  {
    id: "sig-06",
    label: "Vacuum pass",
    hint: "Vacuum floor debris — photo of the finished floor is required.",
    is_required: true,
    photo: "required",
  },
  {
    id: "sig-07",
    label: "Water test",
    hint: "Chlorine, pH and alkalinity measured on site (entered on step 1).",
    is_required: true,
    photo: "none",
  },
  {
    id: "sig-08",
    label: "Balance & treat",
    hint: "Add the chemicals needed to bring water into target range.",
    is_required: true,
    photo: "none",
  },
  {
    id: "sig-09",
    label: "Equipment once-over",
    hint: "Visual check of pump, filter, heater and salt cell for leaks or wear.",
    is_required: true,
    photo: "suggested",
  },
  {
    id: "sig-10",
    label: "Filter PSI — before",
    hint: "Gauge reading before you clean the filter. Photo of the gauge required.",
    is_required: true,
    photo: "required",
  },
  {
    id: "sig-11",
    label: "Filter care",
    hint: "Rinse or backwash the filter on schedule.",
    is_required: true,
    photo: "suggested",
  },
  {
    id: "sig-12",
    label: "Filter PSI — after",
    hint: "Gauge reading once the filter is clean. Photo of the gauge required.",
    is_required: true,
    photo: "required",
  },
  {
    id: "sig-13",
    label: "Chemical & supply check",
    hint: "Note truck inventory levels so nothing runs short on the next stop.",
    is_required: true,
    photo: "none",
  },
  {
    id: "sig-14",
    label: "Spot the opportunity",
    hint: "Flag any repair, upgrade or add-on worth mentioning — use the issue box on wrap-up.",
    is_required: false,
    photo: "suggested",
  },
  {
    id: "sig-15",
    label: "Final walk-around",
    hint: "Pool area tidy, equipment pad neat, gate secured.",
    is_required: true,
    photo: "suggested",
  },
  {
    id: "sig-16",
    label: "Digital service snapshot",
    hint: "Visit notes and photos logged in the customer report.",
    is_required: true,
    photo: "none",
  },
  {
    id: "sig-17",
    label: "Customer follow-up note",
    hint: "Send a quick arrival/completion message if the homeowner isn't on site.",
    is_required: false,
    photo: "none",
  },
];

/**
 * House rule for photo proof: only the vacuum pass and the two filter-PSI
 * gauge shots block completion. Everything else is tick-to-pass with an
 * optional camera (the before/after pool photos are handled separately).
 */
export function photoRuleFor(label: string): ChecklistPhoto {
  const l = label.toLowerCase();
  if (l.includes("vacuum")) return "required";
  if (l.includes("psi") || (l.includes("filter") && l.includes("gauge"))) return "required";
  return "suggested";
}


/** Job workflow phases, in the order a tech runs them. */
export type WorkflowPhase = "arriving" | "in_progress" | "leaving";

export const PHASE_ORDER: WorkflowPhase[] = ["arriving", "in_progress", "leaving"];

export const PHASE_LABEL: Record<WorkflowPhase, string> = {
  arriving: "When arriving",
  in_progress: "In progress",
  leaving: "When leaving",
};

/** Fallback phase for the built-in signature checklist when no template is set. */
export function signaturePhase(id: string): WorkflowPhase {
  if (id <= "sig-02") return "arriving";
  if (id >= "sig-13") return "leaving";
  return "in_progress";
}
