/**
 * Validates a plan definition object against the required schema.
 * @param {unknown} plan
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validatePlan(plan) {
  const errors = [];

  if (!plan || typeof plan !== "object" || Array.isArray(plan)) {
    errors.push("Plan must be a non-null object.");
    return { ok: false, errors };
  }

  if (typeof plan.id !== "string" || plan.id.trim().length === 0) {
    errors.push("Plan must have a non-empty string id.");
  }
  if (typeof plan.version !== "string" || plan.version.trim().length === 0) {
    errors.push("Plan must have a non-empty string version.");
  }
  if (typeof plan.label !== "string" || plan.label.trim().length === 0) {
    errors.push("Plan must have a non-empty string label.");
  }
  if (typeof plan.phaseCount !== "number" || !Number.isInteger(plan.phaseCount) || plan.phaseCount < 1) {
    errors.push("Plan must have a positive integer phaseCount.");
  }

  if (plan.phases !== undefined) {
    if (!Array.isArray(plan.phases)) {
      errors.push("Plan phases must be an array when provided.");
    } else {
      plan.phases.forEach((phase, i) => {
        if (!phase || typeof phase !== "object") {
          errors.push(`Phase at index ${i} must be an object.`);
          return;
        }
        if (typeof phase.name !== "string" || phase.name.trim().length === 0) {
          errors.push(`Phase ${i} must have a non-empty string name.`);
        }
        if (!Number.isInteger(phase.phaseNumber) || phase.phaseNumber < 1) {
          errors.push(`Phase ${i} must have a positive integer phaseNumber.`);
        }
      });
    }
  }

  return { ok: errors.length === 0, errors };
}
