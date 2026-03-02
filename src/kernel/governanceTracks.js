/**
 * Thingstead Governance Kernel — Governance track enumeration.
 *
 * Defines the canonical governance tracks and their behavioral modes.
 * No imports. No side effects. Same foundational pattern as types.js.
 *
 * Each track maps to a (GateMode, GateEnforcementLevel, ChangeControlMode)
 * triple via trackPolicies.js — this module only defines the vocabulary.
 */

// Governance tracks — identifies the lifecycle template family.
export const GovernanceTrack = Object.freeze({
  CPMAI: "CPMAI",
  CPMAI_PLUS: "CPMAI_PLUS",
  PMI_WATERFALL: "PMI_WATERFALL",
  PMI_AGILE: "PMI_AGILE",
});

// Gate progression modes — how phases relate to each other.
export const GateMode = Object.freeze({
  /** All phases must be completed in strict linear order. */
  SEQUENTIAL: "SEQUENTIAL",
  /** Some phases may loop (sprint cycles) before a release gate. */
  ITERATIVE: "ITERATIVE",
});

// Change control modes — how changes to baselined artifacts are governed.
export const ChangeControlMode = Object.freeze({
  /** Changes are tracked but not formally controlled. */
  INFORMAL: "INFORMAL",
  /** Changes require formal Change Control Board approval. */
  FORMAL_CCB: "FORMAL_CCB",
  /** Changes flow through a governed product backlog. */
  BACKLOG_GOVERNED: "BACKLOG_GOVERNED",
});

// Gate enforcement levels — strictness of gate readiness checks.
export const GateEnforcementLevel = Object.freeze({
  /** All gate-blocking artifacts must be complete/waived at every gate. */
  STRICT: "STRICT",
  /** Iterative phases have relaxed enforcement; release gates are strict. */
  RELEASE_BASED: "RELEASE_BASED",
});
