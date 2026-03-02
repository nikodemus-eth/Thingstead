/**
 * Thingstead Governance Kernel — Track policy resolver.
 *
 * Maps each GovernanceTrack to its behavioral configuration:
 * gate mode, change control, enforcement level, and policy overrides.
 *
 * The policy overrides are merged onto DEFAULT_POLICY via compilePolicyForTrack()
 * in policy.js — this module only defines the track → config mapping.
 */

import {
  GovernanceTrack,
  GateMode,
  ChangeControlMode,
  GateEnforcementLevel,
} from "./governanceTracks.js";

// ---------------------------------------------------------------------------
// Track configurations
// ---------------------------------------------------------------------------

const TRACK_CONFIGS = Object.freeze({
  [GovernanceTrack.CPMAI]: Object.freeze({
    gateMode: GateMode.SEQUENTIAL,
    changeControlMode: ChangeControlMode.INFORMAL,
    baselineLocking: false,
    gateEnforcementLevel: GateEnforcementLevel.STRICT,
    iterativePhaseIds: null,
    policyOverrides: null, // CPMAI uses DEFAULT_POLICY as-is.
  }),

  [GovernanceTrack.CPMAI_PLUS]: Object.freeze({
    gateMode: GateMode.SEQUENTIAL,
    changeControlMode: ChangeControlMode.INFORMAL,
    baselineLocking: false,
    gateEnforcementLevel: GateEnforcementLevel.STRICT,
    iterativePhaseIds: null,
    policyOverrides: null, // Forward-compatible; same as CPMAI for now.
  }),

  [GovernanceTrack.PMI_WATERFALL]: Object.freeze({
    gateMode: GateMode.SEQUENTIAL,
    changeControlMode: ChangeControlMode.FORMAL_CCB,
    baselineLocking: true,
    gateEnforcementLevel: GateEnforcementLevel.STRICT,
    iterativePhaseIds: null,
    policyOverrides: Object.freeze({
      gate: Object.freeze({ allow_no_go_continue: false }),
      waiver: Object.freeze({
        friction: Object.freeze({
          supplemental: Object.freeze({ rationale_min_length: 20 }),
          conditional: Object.freeze({ rationale_min_length: 40 }),
          core: Object.freeze({ rationale_min_length: 80 }),
        }),
      }),
    }),
  }),

  [GovernanceTrack.PMI_AGILE]: Object.freeze({
    gateMode: GateMode.ITERATIVE,
    changeControlMode: ChangeControlMode.BACKLOG_GOVERNED,
    baselineLocking: false,
    gateEnforcementLevel: GateEnforcementLevel.RELEASE_BASED,
    iterativePhaseIds: Object.freeze([2, 3, 4]),
    policyOverrides: Object.freeze({
      gate: Object.freeze({ allow_no_go_continue: true }),
    }),
  }),
});

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns the track configuration for the given governance track name.
 *
 * @param {string} trackName - A GovernanceTrack value (e.g., "PMI_WATERFALL").
 * @returns {Object|null} The track config, or null if unrecognized.
 */
export function getTrackPolicy(trackName) {
  return TRACK_CONFIGS[trackName] || null;
}

/**
 * Returns all registered track names.
 *
 * @returns {string[]} Array of GovernanceTrack values.
 */
export function getRegisteredTracks() {
  return Object.keys(TRACK_CONFIGS);
}
