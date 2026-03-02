import { CPMAI_PLAN_ID, CPMAI_PLAN_VERSION, buildNewCpmaiProject } from "./cpmai/index.js";
import { validateCpmaiProfile } from "./cpmai/validate.js";
import { AIPO_PLAN_ID, AIPO_PLAN_VERSION, buildNewAipoProject } from "./aipo-governance/index.js";
import { validateAipoProfile } from "./aipo-governance/validate.js";
import { loadPlanDefinition, getRegisteredPlanIds } from "./loader.js";
import { validatePlan } from "./schema.js";

export const PLAN_REGISTRY = Object.freeze({
  [CPMAI_PLAN_ID]: Object.freeze({
    id: CPMAI_PLAN_ID,
    version: CPMAI_PLAN_VERSION,
    buildNewProject: buildNewCpmaiProject,
    validateProfile: validateCpmaiProfile,
  }),
  [AIPO_PLAN_ID]: Object.freeze({
    id: AIPO_PLAN_ID,
    version: AIPO_PLAN_VERSION,
    buildNewProject: buildNewAipoProject,
    validateProfile: validateAipoProfile,
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

