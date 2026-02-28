/**
 * Thingstead Governance Kernel — Access control at the kernel boundary.
 *
 * Provides the capability check used in Step 2 of the deterministic pipeline.
 * Given an actor and an action, determines whether the actor has the required
 * capability and returns a structured result.
 *
 * This module sits between the queue and the policy enforcer — actions that
 * fail the capability check never reach policy validation.
 */

import { hasCapability, requiredCapability, getCapabilities, ActorType } from "./capabilities.js";

// ---------------------------------------------------------------------------
// Access check
// ---------------------------------------------------------------------------

/**
 * Checks whether an actor is permitted to perform an action.
 *
 * @param {Object} params
 * @param {string} params.actorType - "human" or "agent" (from ActorType).
 * @param {string[]} [params.capabilities] - Override capability set (if not provided, derived from actorType).
 * @param {string} params.actionType - The action being attempted.
 * @returns {{ allowed: boolean, reason: string|null, capability: string|null }}
 */
export function checkAccess({ actorType, capabilities, actionType }) {
  const required = requiredCapability(actionType);

  // No capability required — always allowed.
  if (!required) {
    return { allowed: true, reason: null, capability: null };
  }

  const actorCapabilities = capabilities || getCapabilities(actorType);

  if (hasCapability(actorCapabilities, required)) {
    return { allowed: true, reason: null, capability: required };
  }

  return {
    allowed: false,
    reason: `Actor type "${actorType}" lacks capability "${required}" required for action "${actionType}".`,
    capability: required,
  };
}

/**
 * Determines the actor type from an actor ID or explicit type.
 *
 * Fail-closed: unknown or unrecognized actors default to AGENT (lowest privilege).
 * Human privilege must be explicitly claimed via:
 * - explicitType = ActorType.HUMAN, or
 * - actorId prefixed with "human:" (convention)
 *
 * Agent IDs are prefixed with "agent:" or "openclaw:".
 *
 * @param {string} actorId - The actor identifier.
 * @param {string} [explicitType] - Explicit actor type override.
 * @returns {string} ActorType value.
 */
export function resolveActorType(actorId, explicitType) {
  if (explicitType === ActorType.HUMAN || explicitType === ActorType.AGENT) {
    return explicitType;
  }
  // Explicit human prefix
  if (typeof actorId === "string" && actorId.startsWith("human:")) {
    return ActorType.HUMAN;
  }
  // Explicit agent prefixes
  if (typeof actorId === "string" && (actorId.startsWith("agent:") || actorId.startsWith("openclaw:"))) {
    return ActorType.AGENT;
  }
  // Fail-closed: unknown actor type defaults to lowest privilege (agent).
  return ActorType.AGENT;
}
