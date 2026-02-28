/**
 * Thingstead Governance Kernel — Policy enforcer.
 *
 * Validates actions against the active governance policy.
 * Returns { allowed, reason } for every governance mutation.
 *
 * When an action is blocked, the caller should log an OVERRIDE_ATTEMPTED
 * event to the ledger.
 */

import { resolveConstraint, resolveWaiverMinLength } from "./policy.js";

// ---------------------------------------------------------------------------
// Action types the enforcer understands
// ---------------------------------------------------------------------------

export const PolicyAction = Object.freeze({
  APPLY_WAIVER: "APPLY_WAIVER",
  REMOVE_WAIVER: "REMOVE_WAIVER",
  DECIDE_GATE: "DECIDE_GATE",
  COMPLETE_ARTIFACT: "COMPLETE_ARTIFACT",
});

// ---------------------------------------------------------------------------
// Enforcement
// ---------------------------------------------------------------------------

/**
 * Validates whether an action is allowed under the active policy.
 *
 * @param {Object} action - The action to validate. Shape depends on action.type:
 *   APPLY_WAIVER:      { type, phaseId, artifactId, rationale, category, phaseWaiverCount }
 *   REMOVE_WAIVER:     { type, phaseId, artifactId }
 *   DECIDE_GATE:       { type, phaseId, decision, notes, governanceMode, hasPriorNoGo }
 *   COMPLETE_ARTIFACT: { type, phaseId, artifactId }
 * @param {Object|null} policy - The active governance policy (null = default).
 * @returns {{ allowed: boolean, reason: string|null }}
 */
export function enforcePolicy(action, policy) {
  if (!action || !action.type) {
    return { allowed: true, reason: null };
  }

  switch (action.type) {
    case PolicyAction.APPLY_WAIVER:
      return enforceWaiver(action, policy);
    case PolicyAction.DECIDE_GATE:
      return enforceGateDecision(action, policy);
    default:
      return { allowed: true, reason: null };
  }
}

// ---------------------------------------------------------------------------
// Waiver enforcement
// ---------------------------------------------------------------------------

function enforceWaiver(action, policy) {
  const { rationale, category, phaseWaiverCount } = action;

  // Check rationale minimum length.
  const minLength = resolveWaiverMinLength(policy, category);
  const rationaleLength = typeof rationale === "string"
    ? rationale.replace(/\s+/g, "").length
    : 0;

  if (rationaleLength < minLength) {
    return {
      allowed: false,
      reason: `Waiver rationale must be at least ${minLength} non-whitespace characters (got ${rationaleLength}).`,
    };
  }

  // Check waiver budget per phase.
  const maxPerPhase = resolveConstraint(policy, "waiver.max_per_phase");
  if (maxPerPhase !== null && maxPerPhase !== undefined && typeof phaseWaiverCount === "number") {
    if (phaseWaiverCount >= maxPerPhase) {
      return {
        allowed: false,
        reason: `Phase waiver budget exhausted (maximum ${maxPerPhase} waivers per phase).`,
      };
    }
  }

  return { allowed: true, reason: null };
}

// ---------------------------------------------------------------------------
// Gate decision enforcement
// ---------------------------------------------------------------------------

function enforceGateDecision(action, policy) {
  const { decision, notes, governanceMode, hasPriorNoGo } = action;

  // Solo mode requires attestation notes.
  if (governanceMode === "solo" && decision === "go") {
    const minLength = resolveConstraint(policy, "gate.solo_attestation_min_length") || 30;
    const notesLength = typeof notes === "string"
      ? notes.replace(/\s+/g, "").length
      : 0;

    if (notesLength < minLength) {
      return {
        allowed: false,
        reason: `Solo attestation requires at least ${minLength} non-whitespace characters (got ${notesLength}).`,
      };
    }
  }

  // No-go escalation: if policy disallows continuing after no-go, block subsequent gates.
  const allowNoGoContinue = resolveConstraint(policy, "gate.allow_no_go_continue");
  if (allowNoGoContinue === false && hasPriorNoGo && decision === "go") {
    return {
      allowed: false,
      reason: "Policy does not allow proceeding after a prior no-go decision. Revise policy to continue.",
    };
  }

  return { allowed: true, reason: null };
}
