/**
 * Thingstead Governance Kernel — Capability definitions.
 *
 * Defines the permission model for actors (humans and agents).
 * Capabilities are fine-grained permissions that control what actions
 * an actor can perform within the governance system.
 *
 * Design principles:
 * - Capabilities are additive (deny-by-default).
 * - Humans get a full capability set scoped by governance mode.
 * - Agents get advisory-only capabilities (cannot decide gates or apply waivers).
 * - Capability changes are logged to the ledger.
 */

// ---------------------------------------------------------------------------
// Capability constants
// ---------------------------------------------------------------------------

export const Capability = Object.freeze({
  // Governance capabilities
  GOVERNANCE_GATE_DECIDE: "governance.gate.decide",
  GOVERNANCE_WAIVER_APPLY: "governance.waiver.apply",
  GOVERNANCE_WAIVER_REMOVE: "governance.waiver.remove",
  GOVERNANCE_POLICY_READ: "governance.policy.read",
  GOVERNANCE_POLICY_CHANGE: "governance.policy.change",

  // Artifact capabilities
  ARTIFACT_WRITE: "artifact.write",
  ARTIFACT_READ: "artifact.read",

  // Agent capabilities
  ADVISORY_SUBMIT: "advisory.submit",

  // Ledger capabilities
  LEDGER_READ: "ledger.read",
  LEDGER_EXPORT: "ledger.export",
});

// ---------------------------------------------------------------------------
// Actor types
// ---------------------------------------------------------------------------

export const ActorType = Object.freeze({
  HUMAN: "human",
  AGENT: "agent",
});

// ---------------------------------------------------------------------------
// Capability profiles — predefined sets by actor type and governance mode
// ---------------------------------------------------------------------------

const HUMAN_CAPABILITIES = Object.freeze([
  Capability.GOVERNANCE_GATE_DECIDE,
  Capability.GOVERNANCE_WAIVER_APPLY,
  Capability.GOVERNANCE_WAIVER_REMOVE,
  Capability.GOVERNANCE_POLICY_READ,
  Capability.GOVERNANCE_POLICY_CHANGE,
  Capability.ARTIFACT_WRITE,
  Capability.ARTIFACT_READ,
  Capability.ADVISORY_SUBMIT,
  Capability.LEDGER_READ,
  Capability.LEDGER_EXPORT,
]);

const AGENT_CAPABILITIES = Object.freeze([
  Capability.ADVISORY_SUBMIT,
  Capability.ARTIFACT_READ,
  Capability.LEDGER_READ,
]);

/**
 * Returns the capability set for an actor type.
 *
 * @param {string} actorType - One of ActorType values.
 * @returns {string[]} Array of capability strings.
 */
export function getCapabilities(actorType) {
  switch (actorType) {
    case ActorType.HUMAN:
      return [...HUMAN_CAPABILITIES];
    case ActorType.AGENT:
      return [...AGENT_CAPABILITIES];
    default:
      return [];
  }
}

/**
 * Checks whether a capability set includes a specific capability.
 *
 * @param {string[]} capabilities - The actor's capability set.
 * @param {string} capability - The capability to check.
 * @returns {boolean}
 */
export function hasCapability(capabilities, capability) {
  return Array.isArray(capabilities) && capabilities.includes(capability);
}

// ---------------------------------------------------------------------------
// Action-to-capability mapping
// ---------------------------------------------------------------------------

/**
 * Maps a governance action type to the capability required to perform it.
 * Returns null if no specific capability is required (the action is unrestricted).
 *
 * @param {string} actionType - The action type (from PolicyAction or queue action types).
 * @returns {string|null} The required capability, or null if unrestricted.
 */
export function requiredCapability(actionType) {
  switch (actionType) {
    case "APPLY_WAIVER":
      return Capability.GOVERNANCE_WAIVER_APPLY;
    case "REMOVE_WAIVER":
      return Capability.GOVERNANCE_WAIVER_REMOVE;
    case "DECIDE_GATE":
      return Capability.GOVERNANCE_GATE_DECIDE;
    case "COMPLETE_ARTIFACT":
      return Capability.ARTIFACT_WRITE;
    case "SUBMIT_ADVISORY":
      return Capability.ADVISORY_SUBMIT;
    case "POLICY_CHANGE":
      return Capability.GOVERNANCE_POLICY_CHANGE;
    case "HEARTBEAT":
      return null; // Unrestricted.
    default:
      return null;
  }
}
