import { CPMAI_PLAN_ID, CPMAI_PLAN_VERSION, buildNewCpmaiProject } from "./cpmai/index.js";
import { validateCpmaiProfile } from "./cpmai/validate.js";
import { loadPlanDefinition, getRegisteredPlanIds } from "./loader.js";
import { validatePlan } from "./schema.js";

export const PLAN_REGISTRY = Object.freeze({
  [CPMAI_PLAN_ID]: Object.freeze({
    id: CPMAI_PLAN_ID,
    version: CPMAI_PLAN_VERSION,
    buildNewProject: buildNewCpmaiProject,
    validateProfile: validateCpmaiProfile,
  }),
});

export function getPlan(planId) {
  const key = typeof planId === "string" ? planId.trim() : "";
  return PLAN_REGISTRY[key] || null;
}

/**
 * Returns all loaded plan definitions (structural metadata, not builder functions).
 * @returns {Record<string, object>}
 */
export function loadAllPlans() {
  const results = {};
  for (const planId of getRegisteredPlanIds()) {
    const def = loadPlanDefinition(planId);
    if (def && validatePlan(def).ok) {
      results[planId] = def;
    }
  }
  return results;
}

/**
 * Alias for getPlan — symmetric naming with loadAllPlans.
 * @param {string} planId
 * @returns {object | null}
 */
export function getPlanById(planId) {
  return getPlan(planId);
}

