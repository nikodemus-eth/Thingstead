/**
 * Thingstead Governance Kernel — Policy compiler.
 *
 * Compiles governance policy from defaults + overrides into a resolved,
 * immutable policy object. Policy is the single source of truth for
 * all governance thresholds and constraints.
 *
 * Policy lifecycle:
 *   1. compilePolicy(overrides) → resolved policy
 *   2. Policy is bound to a project (immutable once bound)
 *   3. Changes create a new policy version (logged to ledger)
 *   4. resolveConstraint(policy, path) → value
 */

import { DEFAULT_POLICY, validatePolicy, hashPolicy } from "./policySchema.js";

// ---------------------------------------------------------------------------
// Deep merge (two levels — policy objects are shallow enough)
// ---------------------------------------------------------------------------

function deepMerge(base, overrides) {
  if (!overrides || typeof overrides !== "object") return base;
  const result = { ...base };
  for (const key of Object.keys(overrides)) {
    const baseVal = base[key];
    const overVal = overrides[key];
    if (
      baseVal !== null &&
      typeof baseVal === "object" &&
      !Array.isArray(baseVal) &&
      overVal !== null &&
      typeof overVal === "object" &&
      !Array.isArray(overVal)
    ) {
      result[key] = deepMerge(baseVal, overVal);
    } else {
      result[key] = overVal;
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Policy compilation
// ---------------------------------------------------------------------------

/**
 * Compiles a policy from optional overrides merged onto defaults.
 * The result is validated before returning.
 *
 * @param {Object} [overrides] - Partial policy overrides.
 * @returns {{ policy: Object, hash: string, valid: boolean, errors: string[] }}
 */
export function compilePolicy(overrides) {
  const merged = overrides ? deepMerge(DEFAULT_POLICY, overrides) : { ...DEFAULT_POLICY };
  const validation = validatePolicy(merged);
  const hash = hashPolicy(merged);
  return {
    policy: merged,
    hash,
    valid: validation.valid,
    errors: validation.errors,
  };
}

// ---------------------------------------------------------------------------
// Constraint resolution
// ---------------------------------------------------------------------------

/**
 * Resolves a specific constraint value from a policy object.
 * Falls back to DEFAULT_POLICY if the path is missing.
 *
 * @param {Object|null} policy - The active policy (null = default).
 * @param {string} path - Dot-separated path (e.g., "waiver.rationale_min_length").
 * @returns {*} The resolved constraint value.
 */
export function resolveConstraint(policy, path) {
  const source = policy || DEFAULT_POLICY;
  const parts = path.split(".");
  let current = source;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      // Fall back to default for missing paths.
      return resolveConstraint(DEFAULT_POLICY, path);
    }
    current = current[part];
  }
  // If we got undefined from the policy, fall back to default.
  if (current === undefined && source !== DEFAULT_POLICY) {
    return resolveConstraint(DEFAULT_POLICY, path);
  }
  return current;
}

/**
 * Resolves the waiver rationale minimum length, optionally scaled by artifact category.
 *
 * @param {Object|null} policy - The active policy.
 * @param {string} [category] - Artifact category ("core", "conditional", "supplemental").
 * @returns {number} Minimum non-whitespace character count.
 */
export function resolveWaiverMinLength(policy, category) {
  // If a category-specific friction override exists, use it.
  if (category) {
    const categoryMin = resolveConstraint(policy, `waiver.friction.${category}.rationale_min_length`);
    if (typeof categoryMin === "number" && categoryMin > 0) {
      return categoryMin;
    }
  }
  // Fall back to the global waiver minimum.
  return resolveConstraint(policy, "waiver.rationale_min_length") || 20;
}

/**
 * Creates a new policy version from an existing policy with overrides.
 * Increments the version number.
 *
 * @param {Object} currentPolicy - The current policy.
 * @param {Object} changes - Policy field changes.
 * @returns {{ policy: Object, hash: string, valid: boolean, errors: string[], previousVersion: number }}
 */
export function revisePolicy(currentPolicy, changes) {
  const previousVersion = currentPolicy?.version || 1;
  const revised = deepMerge(currentPolicy || DEFAULT_POLICY, {
    ...changes,
    version: previousVersion + 1,
  });
  const validation = validatePolicy(revised);
  const hash = hashPolicy(revised);
  return {
    policy: revised,
    hash,
    valid: validation.valid,
    errors: validation.errors,
    previousVersion,
  };
}
