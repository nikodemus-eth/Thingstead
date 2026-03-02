/**
 * Shared validation utilities for plan profile validators.
 *
 * All plan validators (AIPO, PMI Waterfall, PMI Agile) share the same
 * structural checks: phase count, phase ID sequence, and canonical naming.
 * This module eliminates the duplication.
 */

export function normalizeName(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Validates phase structure: count, IDs (1..N), and canonical names.
 *
 * @param {Object} project - The project to validate.
 * @param {Object} ctx - Validation context with { errors, warnings } arrays.
 * @param {Object} opts
 * @param {number} opts.expectedCount - Required number of phases.
 * @param {string[]} opts.canonicalNames - Lowercase canonical phase names.
 * @param {string} opts.label - Profile label for error messages (e.g., "PMI Waterfall").
 */
export function validatePhaseStructure(project, ctx, { expectedCount, canonicalNames, label }) {
  const errors = ctx.errors || [];
  const warnings = ctx.warnings || [];

  const phases = project?.phases;
  if (!Array.isArray(phases)) {
    errors.push(`${label} profile requires project.phases array.`);
    return;
  }

  if (phases.length !== expectedCount) {
    errors.push(`${label} profile requires exactly ${expectedCount} phases.`);
    return;
  }

  // Require phase IDs 1..N (order independent).
  const nums = phases.map((p) => p?.phase_number ?? p?.id).sort((a, b) => a - b);
  const expected = Array.from({ length: expectedCount }, (_, i) => i + 1);
  const matches =
    nums.length === expected.length && nums.every((n, i) => n === expected[i]);
  if (!matches) {
    errors.push(`${label} profile requires phase IDs to be exactly [1..${expectedCount}].`);
  }

  // Tolerant naming: normalized string must match canonical set.
  const seen = new Set();
  phases.forEach((phase) => {
    const n = normalizeName(phase?.name);
    if (!n) {
      errors.push(`${label} profile requires each phase to have a name.`);
      return;
    }
    seen.add(n);
  });

  const missing = canonicalNames.filter((name) => !seen.has(name));
  const extra = [...seen].filter((name) => !canonicalNames.includes(name));
  if (missing.length || extra.length) {
    errors.push(`${label} profile requires canonical phase names.`);
    if (missing.length) warnings.push(`${label} missing phase names: ${missing.join(", ")}.`);
    if (extra.length) warnings.push(`${label} extra phase names: ${extra.join(", ")}.`);
  }
}
