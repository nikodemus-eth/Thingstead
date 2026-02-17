import { CPMAI_PLAN_ID, CPMAI_PLAN_VERSION, buildNewCpmaiProject } from "./cpmai/index.js";
import { validateCpmaiProfile } from "./cpmai/validate.js";

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

