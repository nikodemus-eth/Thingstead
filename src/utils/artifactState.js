/**
 * Artifact state utilities — thin wrapper around the governance kernel.
 *
 * Resolves templates via the template registry, then delegates
 * all evaluation logic to the kernel's pure functions.
 */

import { getTemplateForArtifact, isRequiredFieldSatisfied } from "./templateHelpers.js";
import {
  isArtifactWaived as kernelIsArtifactWaived,
  isArtifactComplete as kernelIsArtifactComplete,
  computeArtifactStatus as kernelComputeArtifactStatus,
  countPhaseWaivers as kernelCountPhaseWaivers,
} from "../kernel/index.js";

// Re-export kernel functions that need no template resolution.
export const isArtifactWaived = kernelIsArtifactWaived;
export const countPhaseWaivers = kernelCountPhaseWaivers;

// Resolve template, then delegate to kernel.
export function isArtifactComplete(artifact, phaseId) {
  if (!artifact) return false;
  if (isArtifactWaived(artifact)) return true;

  const phase = { id: phaseId, phase_number: phaseId };
  const { template, binding } = getTemplateForArtifact(phase, artifact);
  return kernelIsArtifactComplete(artifact, template, binding);
}

export function computeArtifactStatus(artifact, phaseId) {
  if (!artifact) return "not-started";

  const phase = { id: phaseId, phase_number: phaseId };
  const { template, binding } = getTemplateForArtifact(phase, artifact);
  return kernelComputeArtifactStatus(artifact, template, binding);
}

export function countPhaseCompletedArtifacts(phase) {
  const artifacts = phase?.artifacts || [];
  const phaseId = phase?.id;
  return artifacts.filter((a) => isArtifactComplete(a, phaseId)).length;
}
