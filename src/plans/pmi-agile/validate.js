import { validatePhaseStructure } from "../validationUtils.js";

const AGILE_PHASE_NAMES = [
  "initiation",
  "sprint planning",
  "sprint execution",
  "sprint review",
  "release gate",
  "deployment",
  "monitoring",
  "closure",
];

export function validateAgileProfile(project, ctx = {}) {
  validatePhaseStructure(project, ctx, {
    expectedCount: 8,
    canonicalNames: AGILE_PHASE_NAMES,
    label: "PMI Agile",
  });
}
