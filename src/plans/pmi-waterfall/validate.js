import { validatePhaseStructure } from "../validationUtils.js";

const WATERFALL_PHASE_NAMES = [
  "initiation",
  "planning",
  "requirements",
  "build",
  "verification",
  "deployment",
  "operations",
  "closure",
];

export function validateWaterfallProfile(project, ctx = {}) {
  validatePhaseStructure(project, ctx, {
    expectedCount: 8,
    canonicalNames: WATERFALL_PHASE_NAMES,
    label: "PMI Waterfall",
  });
}
