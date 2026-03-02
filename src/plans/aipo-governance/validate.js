function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

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
  const errors = ctx.errors || [];
  const warnings = ctx.warnings || [];

  const phases = project?.phases;
  if (!Array.isArray(phases)) {
    errors.push("AIPO profile requires project.phases array.");
    return;
  }

  if (phases.length !== 8) {
    errors.push("AIPO profile requires exactly 8 phases.");
    return;
  }

  // Require phase_number == 1..8 (order independent).
  const nums = phases.map((p) => p?.phase_number ?? p?.id).sort((a, b) => a - b);
  const expected = [1, 2, 3, 4, 5, 6, 7, 8];
  const matches =
    nums.length === expected.length && nums.every((n, i) => n === expected[i]);
  if (!matches) {
    errors.push("AIPO profile requires phase IDs to be exactly [1..8].");
  }

  // Tolerant naming: normalized string must match canonical set.
  const seen = new Set();
  phases.forEach((phase) => {
    const n = normalizeName(phase?.name);
    if (!n) {
      errors.push("AIPO profile requires each phase to have a name.");
      return;
    }
    seen.add(n);
  });

  const missing = AIPO_PHASE_NAMES.filter((name) => !seen.has(name));
  const extra = [...seen].filter((name) => !AIPO_PHASE_NAMES.includes(name));
  if (missing.length || extra.length) {
    errors.push("AIPO profile requires canonical phase names (P0 Strategic Initiation through P7 Controlled Closure).");
    if (missing.length) warnings.push(`AIPO missing phase names: ${missing.join(", ")}.`);
    if (extra.length) warnings.push(`AIPO extra phase names: ${extra.join(", ")}.`);
  }

  // Validate classification level if present
  const validLevels = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "CUI", "RESTRICTED"];
  if (project.classification_level && !validLevels.includes(project.classification_level)) {
    warnings.push(`AIPO classification_level "${project.classification_level}" is not a recognized level.`);
  }
}
