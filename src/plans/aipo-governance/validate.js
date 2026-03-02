import { validatePhaseStructure } from "../validationUtils.js";

const AIPO_PHASE_NAMES = [
  "strategic initiation",
  "problem definition",
  "data understanding",
  "data preparation",
  "modeling",
  "evaluation",
  "deployment & monitoring",
  "controlled closure & stewardship",
];

export function validateAipoProfile(project, ctx = {}) {
  validatePhaseStructure(project, ctx, {
    expectedCount: 8,
    canonicalNames: AIPO_PHASE_NAMES,
    label: "AIPO",
  });

  // AIPO-specific: validate classification level if present.
  const warnings = ctx.warnings || [];
  const validLevels = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "CUI", "RESTRICTED"];
  if (project.classification_level && !validLevels.includes(project.classification_level)) {
    warnings.push(`AIPO classification_level "${project.classification_level}" is not a recognized level.`);
  }
}
