/**
 * Shared gate-readiness logic.
 * Used by GoNoGoDecision, GateOverview, and PhaseNav.
 */
import { isArtifactComplete, isArtifactWaived } from "./artifactState.js";

export function isGateReady(phase) {
  const artifacts = phase?.artifacts || [];
  const blocking = artifacts.filter((artifact) => artifact.isGateBlocking);
  return blocking.every((artifact) => {
    if (isArtifactWaived(artifact)) return true;
    return isArtifactComplete(artifact, phase?.id);
  });
}
