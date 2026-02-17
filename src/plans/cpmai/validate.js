function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\\s+/g, " ")
    .trim();
}

const CPMAI_PHASE_NAMES = [
  "business understanding",
  "data understanding",
  "data preparation",
  "model building",
  "model evaluation",
  "model deployment",
];

export function validateCpmaiProfile(project, ctx = {}) {
  const errors = ctx.errors || [];
  const warnings = ctx.warnings || [];

  const phases = project?.phases;
  if (!Array.isArray(phases)) {
    errors.push("CPMAI profile requires project.phases array.");
    return;
  }

  if (phases.length !== 6) {
    errors.push("CPMAI profile requires exactly 6 phases.");
    return;
  }

  // Require phase_number == 1..6 (order independent).
  const nums = phases.map((p) => p?.phase_number).sort((a, b) => a - b);
  const expected = [1, 2, 3, 4, 5, 6];
  const matches =
    nums.length === expected.length && nums.every((n, i) => n === expected[i]);
  if (!matches) {
    errors.push("CPMAI profile requires phase.phase_number to be exactly [1..6].");
  }

  // Tolerant naming: normalized string must match canonical set.
  const seen = new Set();
  phases.forEach((phase) => {
    const n = normalizeName(phase?.name);
    if (!n) {
      errors.push(`CPMAI profile requires each phase to have a name.`);
      return;
    }
    seen.add(n);
  });

  const missing = CPMAI_PHASE_NAMES.filter((name) => !seen.has(name));
  const extra = [...seen].filter((name) => !CPMAI_PHASE_NAMES.includes(name));
  if (missing.length || extra.length) {
    errors.push("CPMAI profile requires canonical phase names (Business/Data/.../Deployment).");
    if (missing.length) warnings.push(`CPMAI missing phase names: ${missing.join(", ")}.`);
    if (extra.length) warnings.push(`CPMAI extra phase names: ${extra.join(", ")}.`);
  }
}

