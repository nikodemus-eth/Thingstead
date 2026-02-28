/**
 * Thingstead Governance Kernel — Canonical type constants.
 *
 * No imports. No side effects. This is the foundation.
 */

// Phase lifecycle states (computed, never persisted).
export const PhaseState = Object.freeze({
  LOCKED: "locked",
  READY: "ready",
  DECIDED: "decided",
});

// Gate decision statuses (persisted on goNoGoDecision.status).
export const DecisionStatus = Object.freeze({
  PENDING: "pending",
  GO: "go",
  NO_GO: "no-go",
});

// Artifact completion statuses (computed, never persisted).
export const ArtifactStatus = Object.freeze({
  NOT_STARTED: "not-started",
  IN_PROGRESS: "in-progress",
  COMPLETE: "complete",
  WAIVED: "waived",
});

// Template binding statuses returned by template resolution.
export const BindingStatus = Object.freeze({
  VERIFIED: "verified",
  UNVERIFIED: "unverified",
  LEGACY: "legacy",
  MISMATCH: "mismatch",
  UNRESOLVED: "unresolved",
  REGISTRY_CORRUPT: "registry-corrupt",
  MISSING: "missing",
});

// Artifact categories (used for waiver friction scaling in Milestone 6).
export const ArtifactCategory = Object.freeze({
  CORE: "core",
  CONDITIONAL: "conditional",
  SUPPLEMENTAL: "supplemental",
});

// Governance modes (set at project creation, immutable).
export const GovernanceMode = Object.freeze({
  SOLO: "solo",
  TEAM: "team",
});

// Attestation types (tied to governance mode).
export const AttestationType = Object.freeze({
  SOLO: "solo_attestation",
  TEAM: "team_decision",
});
