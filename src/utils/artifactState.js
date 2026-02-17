import { getTemplateForArtifact, isRequiredFieldSatisfied } from "./templateHelpers.js";

function hasText(value, minChars = 1) {
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

export function isArtifactWaived(artifact) {
  const waiver = artifact?.waiver;
  if (!waiver || typeof waiver !== "object") return false;
  if (waiver.waived !== true) return false;
  return hasText(waiver.rationale, 20);
}

export function isArtifactComplete(artifact, phaseId) {
  if (!artifact) return false;
  if (isArtifactWaived(artifact)) return true;

  const phase = { id: phaseId, phase_number: phaseId };
  const { template, binding } = getTemplateForArtifact(phase, artifact);
  // If a template is expected but binding can't be verified, treat as incomplete.
  if (binding === "mismatch" || binding === "unresolved" || binding === "registry-corrupt") {
    return false;
  }
  if (template && Array.isArray(template.fields) && template.fields.length > 0) {
    const fieldValues = artifact.field_values || artifact.templateData || {};
    const requiredFields = template.fields.filter((f) => f.required);
    if (requiredFields.length === 0) return true;
    return requiredFields.every((field) =>
      isRequiredFieldSatisfied(field, fieldValues[field.fieldId])
    );
  }

  // Non-templated fallback: treat meaningful written content as completion.
  if (hasText(artifact.rationale, 20)) return true;
  if (hasText(artifact.notes, 20)) return true;
  return false;
}

export function computeArtifactStatus(artifact, phaseId) {
  if (!artifact) return "not-started";
  if (isArtifactWaived(artifact)) return "waived";
  if (isArtifactComplete(artifact, phaseId)) return "complete";

  const hasAnyDetails =
    hasText(artifact.rationale, 1) ||
    hasText(artifact.notes, 1) ||
    anyTemplateDataContent(artifact.field_values || artifact.templateData) ||
    (Array.isArray(artifact.comments) && artifact.comments.length > 0);

  return hasAnyDetails ? "in-progress" : "not-started";
}

export function countPhaseWaivers(phase) {
  const artifacts = phase?.artifacts || [];
  return artifacts.filter((a) => isArtifactWaived(a)).length;
}

export function countPhaseCompletedArtifacts(phase) {
  const artifacts = phase?.artifacts || [];
  const phaseId = phase?.id;
  return artifacts.filter((a) => isArtifactComplete(a, phaseId)).length;
}
