/**
 * Thingstead Governance Kernel — Gate readiness evaluation.
 *
 * Pure functions for determining whether a phase gate is ready
 * for a go/no-go decision. Template resolution is the caller's
 * responsibility via the resolveTemplate parameter.
 *
 * Policy-aware: accepts an optional policy parameter that flows
 * through to artifact evaluation functions.
 */

import { isArtifactWaived, isArtifactComplete } from "./artifactEvaluator.js";
import { GateMode, GateEnforcementLevel } from "./governanceTracks.js";

/**
 * Determines if a phase gate is ready for decision.
 *
 * @param {Object} phase - The phase to evaluate.
 * @param {Function} resolveTemplate - (phase, artifact) => { template, binding }.
 *   Resolves an artifact's template. The kernel does not access the template
 *   registry directly — this function bridges that boundary.
 * @param {Object} [policy] - Active governance policy (null = default).
 * @param {Object} [trackPolicy] - Track configuration from getTrackPolicy().
 *   When provided, enables track-aware gate evaluation:
 *   - ITERATIVE + RELEASE_BASED: iterative-phase gates are always ready.
 *   - All other combinations: standard sequential evaluation.
 * @returns {boolean} True if all gate-blocking artifacts are complete or waived.
 */
export function isGateReady(phase, resolveTemplate, policy, trackPolicy) {
  // Track-aware: iterative phases with release-based enforcement are always ready.
  if (
    trackPolicy &&
    trackPolicy.gateMode === GateMode.ITERATIVE &&
    trackPolicy.gateEnforcementLevel === GateEnforcementLevel.RELEASE_BASED &&
    Array.isArray(trackPolicy.iterativePhaseIds) &&
    trackPolicy.iterativePhaseIds.includes(phase?.id)
  ) {
    return true;
  }

  // Standard sequential evaluation.
  const artifacts = phase?.artifacts || [];
  const blocking = artifacts.filter((artifact) => artifact.isGateBlocking);
  return blocking.every((artifact) => {
    if (isArtifactWaived(artifact, policy)) return true;
    const { template, binding } = resolveTemplate(phase, artifact);
    return isArtifactComplete(artifact, template, binding, policy);
  });
}
