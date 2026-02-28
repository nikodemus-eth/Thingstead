/**
 * Thingstead Governance Kernel — Project integrity verification.
 *
 * Pure functions for computing and verifying project integrity.
 * No browser APIs (no localStorage, no crypto.subtle).
 * Signing lives outside the kernel in the utils layer.
 */

import { stableStringify, sha256HexFromString } from "./hash.js";

// ---------------------------------------------------------------------------
// Canonical representation
// ---------------------------------------------------------------------------

export function stripIntegrityForCanonical(project) {
  if (!project || typeof project !== "object") return project;
  const cloned = JSON.parse(stableStringify(project));
  delete cloned.integrity;
  return cloned;
}

// ---------------------------------------------------------------------------
// Hash computation
// ---------------------------------------------------------------------------

export function computeProjectIntegrity(project) {
  const canonicalObj = stripIntegrityForCanonical(project);
  const canonical = stableStringify(canonicalObj);
  const hash = sha256HexFromString(canonical);
  return {
    algorithm: "sha256",
    canonical_version: "1",
    hash,
    computed_at: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------
// Structural verification
// ---------------------------------------------------------------------------

export function verifyProjectIntegrity(project) {
  const errors = [];
  const warnings = [];

  if (!project || typeof project !== "object") {
    return { ok: false, errors: ["Project is not an object."], warnings };
  }

  // 1. Hash verification
  if (project.integrity?.hash) {
    const recomputed = computeProjectIntegrity(project);
    if (recomputed.hash !== project.integrity.hash) {
      errors.push(
        `Integrity hash mismatch: expected ${project.integrity.hash}, got ${recomputed.hash}. Project may have been modified outside Thingstead.`
      );
    }
  } else {
    warnings.push("No integrity hash found. Cannot verify project authenticity.");
  }

  // 2. Phase ID uniqueness
  const phaseIds = new Set();
  for (const phase of project.phases || []) {
    if (phaseIds.has(phase.id)) {
      errors.push(`Duplicate phase ID: ${phase.id}`);
    }
    phaseIds.add(phase.id);
  }

  // 3. Artifact ID uniqueness across project
  const artifactIds = new Set();
  for (const phase of project.phases || []) {
    for (const artifact of phase.artifacts || []) {
      if (artifactIds.has(artifact.id)) {
        errors.push(`Duplicate artifact ID across phases: ${artifact.id}`);
      }
      artifactIds.add(artifact.id);
    }
  }

  // 4. Gate decision validity
  for (const phase of project.phases || []) {
    const decision = phase.goNoGoDecision;
    if (decision && (decision.status === "go" || decision.status === "no-go")) {
      if (!decision.decidedAt) {
        errors.push(
          `Phase ${phase.id} has ${decision.status} decision without decidedAt timestamp.`
        );
      }
    }
  }

  // 5. Waiver rationale length
  for (const phase of project.phases || []) {
    for (const artifact of phase.artifacts || []) {
      if (artifact.waiver?.waived && typeof artifact.waiver.rationale === "string") {
        if (artifact.waiver.rationale.replace(/\s+/g, "").length < 20) {
          warnings.push(
            `Artifact "${artifact.name || artifact.id}" has a short waiver rationale (< 20 non-whitespace chars).`
          );
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
