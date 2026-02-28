/**
 * Shared gate-readiness logic — thin wrapper around the governance kernel.
 * Used by GoNoGoDecision, GateOverview, and PhaseNav.
 */
import { getTemplateForArtifact } from "./templateHelpers.js";
import { isGateReady as kernelIsGateReady } from "../kernel/index.js";

export function isGateReady(phase) {
  return kernelIsGateReady(phase, getTemplateForArtifact);
}
