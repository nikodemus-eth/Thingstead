/**
 * Plan definition loader.
 * Uses static imports (not dynamic import()) for Vite bundler compatibility.
 * To add a new plan: add its definition.json and register it in PLAN_DEFINITIONS below.
 */

import cpmaiDef from "./cpmai/definition.json";
import agentLifecycleDef from "./openclaws-agent-lifecycle/definition.json";

const PLAN_DEFINITIONS = {
  cpmai: cpmaiDef,
  "openclaws-agent-lifecycle": agentLifecycleDef,
};

/**
 * Returns a plan definition by ID, or null if not found.
 * @param {string} planId
 * @returns {object | null}
 */
export function loadPlanDefinition(planId) {
  return PLAN_DEFINITIONS[planId] ?? null;
}

/**
 * Returns all registered plan IDs.
 * @returns {string[]}
 */
export function getRegisteredPlanIds() {
  return Object.keys(PLAN_DEFINITIONS);
}
