/**
 * Thingstead Governance Kernel — Phase state machine.
 *
 * Computes the lifecycle state of a phase based on gate readiness
 * and decision status. Pure function — no side effects.
 */

import { PhaseState, DecisionStatus } from "./types.js";

/**
 * Computes the current lifecycle state of a phase.
 *
 * LOCKED  → gate-blocking artifacts are incomplete.
 * READY   → all gate-blocking artifacts satisfied; awaiting decision.
 * DECIDED → a go or no-go decision has been recorded.
 *
 * @param {Object} phase - The phase object.
 * @param {boolean} gateReady - Whether the gate is ready (from gateEvaluator).
 * @returns {string} One of PhaseState.LOCKED, PhaseState.READY, PhaseState.DECIDED.
 */
export function computePhaseState(phase, gateReady) {
  const decision = phase?.goNoGoDecision;
  if (
    decision &&
    (decision.status === DecisionStatus.GO || decision.status === DecisionStatus.NO_GO)
  ) {
    return PhaseState.DECIDED;
  }
  return gateReady ? PhaseState.READY : PhaseState.LOCKED;
}
