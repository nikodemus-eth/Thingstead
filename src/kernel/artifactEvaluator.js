/**
 * Thingstead Governance Kernel — Artifact evaluation.
 *
 * Pure functions for determining artifact completion, waiver status,
 * and overall artifact state. No browser APIs. No template registry access.
 *
 * Template resolution is the caller's responsibility — these functions
 * accept already-resolved {template, binding} parameters.
 *
 * Policy-aware: functions accept an optional policy parameter.
 * When null/undefined, defaults match existing behavior (20 chars).
 */

import { BindingStatus, ArtifactStatus } from "./types.js";
import { resolveConstraint, resolveWaiverMinLength } from "./policy.js";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

export function hasText(value, minChars = 1) {
  if (typeof value !== "string") return false;
  return value.trim().length >= minChars;
}

function anyTemplateDataContent(templateData) {
  if (!templateData || typeof templateData !== "object") return false;
  return Object.values(templateData).some((v) => {
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (typeof v === "number" || typeof v === "boolean") return true;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") return Object.keys(v).length > 0;
    return false;
  });
}

// ---------------------------------------------------------------------------
// Field validation (pure — no template registry)
// ---------------------------------------------------------------------------

export function isRequiredFieldSatisfied(field, value) {
  if (!field?.required) return true;

  if (field.type === "short_text" || field.type === "long_text") {
    if (!hasText(value)) return false;
    const minLength = Number(field?.validation?.minLength || 0);
    return value.trim().length >= minLength;
  }

  if (field.type === "selection" || field.type === "date") {
    return hasText(value);
  }

  if (field.type === "checklist") {
    return Array.isArray(value) && value.length > 0;
  }

  if (field.type === "table") {
    if (!Array.isArray(value) || value.length === 0) return false;
    const columns = field.columns || [];
    return value.some((row) =>
      columns.every((column) => hasText(row?.[column.name]))
    );
  }

  return true;
}

// ---------------------------------------------------------------------------
// Waiver evaluation (policy-aware)
// ---------------------------------------------------------------------------

/**
 * Determines if an artifact is effectively waived.
 *
 * @param {Object} artifact - The artifact to evaluate.
 * @param {Object} [policy] - Active governance policy (null = default).
 * @param {string} [category] - Artifact category for friction scaling.
 * @returns {boolean}
 */
export function isArtifactWaived(artifact, policy, category) {
  const waiver = artifact?.waiver;
  if (!waiver || typeof waiver !== "object") return false;
  if (waiver.waived !== true) return false;
  const minLength = resolveWaiverMinLength(policy || null, category);
  return hasText(waiver.rationale, minLength);
}

// ---------------------------------------------------------------------------
// Artifact completion (accepts resolved template + binding, policy-aware)
// ---------------------------------------------------------------------------

/**
 * Determines if an artifact is complete.
 *
 * @param {Object} artifact - The artifact to evaluate.
 * @param {Object} template - Resolved template (or null).
 * @param {string} binding - Template binding status.
 * @param {Object} [policy] - Active governance policy (null = default).
 * @param {string} [category] - Artifact category for waiver friction scaling.
 * @returns {boolean}
 */
export function isArtifactComplete(artifact, template, binding, policy, category) {
  if (!artifact) return false;
  if (isArtifactWaived(artifact, policy, category)) return true;

  // Invalid template bindings mean the artifact can't be validated.
  if (
    binding === BindingStatus.MISMATCH ||
    binding === BindingStatus.UNRESOLVED ||
    binding === BindingStatus.REGISTRY_CORRUPT
  ) {
    return false;
  }

  // Template-driven validation.
  if (template && Array.isArray(template.fields) && template.fields.length > 0) {
    const fieldValues = artifact.field_values || artifact.templateData || {};
    const requiredFields = template.fields.filter((f) => f.required);
    if (requiredFields.length === 0) return true;
    return requiredFields.every((field) =>
      isRequiredFieldSatisfied(field, fieldValues[field.fieldId])
    );
  }

  // Non-templated fallback: meaningful written content counts as completion.
  const completionMin = resolveConstraint(policy || null, "artifact.non_templated_completion_min_length") || 20;
  if (hasText(artifact.rationale, completionMin)) return true;
  if (hasText(artifact.notes, completionMin)) return true;
  return false;
}

// ---------------------------------------------------------------------------
// Artifact status computation (accepts resolved template + binding)
// ---------------------------------------------------------------------------

/**
 * @param {Object} artifact
 * @param {Object} template
 * @param {string} binding
 * @param {Object} [policy]
 * @param {string} [category]
 * @returns {string} ArtifactStatus value.
 */
export function computeArtifactStatus(artifact, template, binding, policy, category) {
  if (!artifact) return ArtifactStatus.NOT_STARTED;
  if (isArtifactWaived(artifact, policy, category)) return ArtifactStatus.WAIVED;
  if (isArtifactComplete(artifact, template, binding, policy, category)) return ArtifactStatus.COMPLETE;

  const hasAnyDetails =
    hasText(artifact.rationale, 1) ||
    hasText(artifact.notes, 1) ||
    anyTemplateDataContent(artifact.field_values || artifact.templateData) ||
    (Array.isArray(artifact.comments) && artifact.comments.length > 0);

  return hasAnyDetails ? ArtifactStatus.IN_PROGRESS : ArtifactStatus.NOT_STARTED;
}

// ---------------------------------------------------------------------------
// Phase-level artifact counting
// ---------------------------------------------------------------------------

export function countPhaseWaivers(phase, policy) {
  const artifacts = phase?.artifacts || [];
  return artifacts.filter((a) => isArtifactWaived(a, policy)).length;
}
