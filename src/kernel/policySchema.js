/**
 * Thingstead Governance Kernel — Policy schema and defaults.
 *
 * Defines the canonical policy shape. Every policy constraint that was
 * previously hardcoded is now explicit and configurable here.
 *
 * The DEFAULT_POLICY matches current behavior exactly — migrating
 * existing projects to the policy system introduces zero breaking changes.
 */

import { stableStringify, sha256HexFromString } from "./hash.js";

// ---------------------------------------------------------------------------
// Default policy (matches all existing hardcoded behavior)
// ---------------------------------------------------------------------------

export const DEFAULT_POLICY = Object.freeze({
  version: 1,
  name: "default",

  // Waiver constraints
  waiver: Object.freeze({
    // Minimum non-whitespace chars for a valid waiver rationale.
    rationale_min_length: 20,

    // Per-category friction scaling.
    // Default: uniform 20-char minimum (backward compatible).
    // Projects can opt into tiered friction via policy overrides:
    //   supplemental: 20, conditional: 40, core: 80
    friction: Object.freeze({
      supplemental: Object.freeze({ rationale_min_length: 20 }),
      conditional: Object.freeze({ rationale_min_length: 20 }),
      core: Object.freeze({ rationale_min_length: 20 }),
    }),

    // Maximum waivers per phase (null = unlimited).
    max_per_phase: null,
  }),

  // Gate decision constraints
  gate: Object.freeze({
    // Minimum non-whitespace chars for solo attestation notes.
    solo_attestation_min_length: 30,

    // Whether a no-go decision blocks subsequent phases until policy revision.
    allow_no_go_continue: true,
  }),

  // Artifact completion constraints
  artifact: Object.freeze({
    // Minimum chars for non-templated artifact completion (rationale or notes).
    non_templated_completion_min_length: 20,
  }),

  // Governance mode constraints
  governance: Object.freeze({
    // Allowed modes.
    allowed_modes: Object.freeze(["solo", "team"]),

    // Default template set profile by mode.
    default_profiles: Object.freeze({
      solo: "minimum-compliance",
      team: "standard",
    }),
  }),

  // History constraints
  history: Object.freeze({
    // Maximum undo snapshots retained.
    max_snapshots: 5,
  }),
});

// ---------------------------------------------------------------------------
// Policy validation
// ---------------------------------------------------------------------------

/**
 * Validates a policy object against the canonical schema.
 *
 * @param {Object} policy - The policy to validate.
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validatePolicy(policy) {
  const errors = [];

  if (!policy || typeof policy !== "object") {
    return { valid: false, errors: ["Policy must be a non-null object."] };
  }

  if (typeof policy.version !== "number" || !Number.isInteger(policy.version) || policy.version < 1) {
    errors.push("Policy version must be a positive integer.");
  }

  // Waiver constraints
  if (policy.waiver) {
    const w = policy.waiver;
    if (typeof w.rationale_min_length === "number" && (w.rationale_min_length < 1 || !Number.isInteger(w.rationale_min_length))) {
      errors.push("waiver.rationale_min_length must be a positive integer.");
    }
    if (w.max_per_phase !== null && w.max_per_phase !== undefined) {
      if (typeof w.max_per_phase !== "number" || !Number.isInteger(w.max_per_phase) || w.max_per_phase < 0) {
        errors.push("waiver.max_per_phase must be a non-negative integer or null.");
      }
    }
  }

  // Gate constraints
  if (policy.gate) {
    const g = policy.gate;
    if (typeof g.solo_attestation_min_length === "number" && (g.solo_attestation_min_length < 1 || !Number.isInteger(g.solo_attestation_min_length))) {
      errors.push("gate.solo_attestation_min_length must be a positive integer.");
    }
    if (g.allow_no_go_continue !== undefined && typeof g.allow_no_go_continue !== "boolean") {
      errors.push("gate.allow_no_go_continue must be a boolean.");
    }
  }

  // Artifact constraints
  if (policy.artifact) {
    const a = policy.artifact;
    if (typeof a.non_templated_completion_min_length === "number" && (a.non_templated_completion_min_length < 1 || !Number.isInteger(a.non_templated_completion_min_length))) {
      errors.push("artifact.non_templated_completion_min_length must be a positive integer.");
    }
  }

  return { valid: errors.length === 0, errors };
}

// ---------------------------------------------------------------------------
// Policy hashing
// ---------------------------------------------------------------------------

/**
 * Computes a deterministic SHA-256 hash of a policy object.
 * Used for versioning and ledger references.
 *
 * @param {Object} policy - The policy to hash.
 * @returns {string} Hex-encoded SHA-256 hash.
 */
export function hashPolicy(policy) {
  return sha256HexFromString(stableStringify(policy));
}
