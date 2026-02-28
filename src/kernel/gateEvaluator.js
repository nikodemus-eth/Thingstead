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

/**
 * Determines if a phase gate is ready for decision.
 *
 * @param {Object} phase - The phase to evaluate.
 * @param {Function} resolveTemplate - (phase, artifact) => { template, binding }.
 *   Resolves an artifact's template. The kernel does not access the template
 *   registry directly — this function bridges that boundary.
 * @param {Object} [policy] - Active governance policy (null = default).
 * @returns {boolean} True if all gate-blocking artifacts are complete or waived.
 */
export function isGateReady(phase, resolveTemplate, policy) {
  const artifacts = phase?.artifacts || [];
  const blocking = artifacts.filter((artifact) => artifact.isGateBlocking);
  return blocking.every((artifact) => {
    if (isArtifactWaived(artifact, policy)) return true;
    const { template, binding } = resolveTemplate(phase, artifact);
    return isArtifactComplete(artifact, template, binding, policy);
  });
}
