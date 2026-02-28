/**
 * Shared template utility functions extracted from ArtifactList.
 *
 * isRequiredFieldSatisfied is now owned by the governance kernel.
 * This module re-exports it for backward compatibility.
 */
import {
  getTemplateVersion,
  findTemplateLegacyByPhaseAndName,
} from "../modules/templateRegistry/index.js";
import { isRequiredFieldSatisfied } from "../kernel/artifactEvaluator.js";

export { isRequiredFieldSatisfied };

export function defaultCellValue(column) {
  if (column?.type === "selection") return column.options?.[0] || "";
  return "";
}

export function getTemplateForArtifact(phase, artifact) {
  if (!artifact) return { template: null, binding: "missing" };
  const templateId = artifact.template_id;
  const templateVersion = artifact.template_version;
  const storedHash = artifact.template_hash;

  if (typeof templateId === "string" && templateId.trim().length > 0 && templateVersion) {
    const t = getTemplateVersion(templateId, templateVersion);
    if (!t) return { template: null, binding: "unresolved" };

    if (typeof storedHash === "string" && storedHash.length > 0) {
      if (storedHash !== t.template_hash) return { template: null, binding: "mismatch" };
      return { template: t, binding: "verified" };
    }

    // Legacy projects may not carry hash yet.
    return { template: t, binding: "unverified" };
  }

  // Legacy binding by phase + artifact name.
  const phaseNumber = phase?.phase_number ?? phase?.id;
  const legacy = findTemplateLegacyByPhaseAndName(phaseNumber, artifact.name);
  return legacy ? { template: legacy, binding: "legacy" } : { template: null, binding: "missing" };
}

export function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}
