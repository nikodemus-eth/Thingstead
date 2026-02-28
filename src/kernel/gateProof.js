/**
 * Thingstead Governance Kernel — Gate transition proof.
 *
 * Generates a cryptographic proof at the moment a gate decision is made.
 * The proof captures the exact state of every artifact at evaluation time,
 * including completion method, field summaries, and waiver details.
 *
 * The proof is:
 * 1. A snapshot of what was evaluated
 * 2. Hashed for tamper detection
 * 3. Appended to the ledger as part of the GATE_DECIDED event payload
 */

import { sha256HexFromString, stableStringify } from "./hash.js";
import { isArtifactWaived, isArtifactComplete, computeArtifactStatus } from "./artifactEvaluator.js";

// ---------------------------------------------------------------------------
// Proof generation
// ---------------------------------------------------------------------------

/**
 * Generates a gate transition proof for a phase.
 *
 * @param {Object} phase - The phase being decided.
 * @param {Function} resolveTemplate - (phase, artifact) => { template, binding }.
 * @param {Object} [policy] - Active governance policy.
 * @param {Object} decision - The gate decision being made.
 * @param {string} decision.status - "go" or "no-go".
 * @param {string} [decision.notes] - Decision notes.
 * @param {string} actorId - The actor making the decision.
 * @returns {Object} Gate proof object.
 */
export function generateGateProof(phase, resolveTemplate, policy, decision, actorId) {
  const artifacts = phase?.artifacts || [];
  const evaluatedAt = new Date().toISOString();

  const artifactSnapshots = artifacts.map((artifact) => {
    const { template, binding } = resolveTemplate(phase, artifact);
    const status = computeArtifactStatus(artifact, template, binding, policy);
    const waived = isArtifactWaived(artifact, policy);
    const complete = isArtifactComplete(artifact, template, binding, policy);

    const snapshot = {
      id: artifact.id,
      name: artifact.name || null,
      isGateBlocking: Boolean(artifact.isGateBlocking),
      status,
      waived,
      complete,
      binding,
      templateId: artifact.template_id || null,
    };

    // Include waiver details if waived.
    if (waived && artifact.waiver) {
      snapshot.waiver = {
        rationale_length: typeof artifact.waiver.rationale === "string"
          ? artifact.waiver.rationale.replace(/\s+/g, "").length
          : 0,
        waived_at: artifact.waiver.waived_at || null,
        waived_by: artifact.waiver.waived_by || null,
      };
    }

    // Include completion method summary.
    if (complete && !waived) {
      if (template && Array.isArray(template.fields)) {
        const fieldValues = artifact.field_values || artifact.templateData || {};
        const requiredFields = template.fields.filter((f) => f.required);
        snapshot.completionMethod = "template";
        snapshot.requiredFieldCount = requiredFields.length;
        snapshot.satisfiedFieldCount = requiredFields.filter((field) => {
          const value = fieldValues[field.fieldId];
          return value !== null && value !== undefined && value !== "";
        }).length;
      } else {
        snapshot.completionMethod = "non-templated";
      }
    }

    return snapshot;
  });

  const proofData = {
    phaseId: phase.id,
    phaseName: phase.name || null,
    decision: decision.status,
    notes: decision.notes || "",
    actorId: actorId || "unknown",
    evaluatedAt,
    artifactCount: artifacts.length,
    gateBlockingCount: artifacts.filter((a) => a.isGateBlocking).length,
    waivedCount: artifactSnapshots.filter((s) => s.waived).length,
    completedCount: artifactSnapshots.filter((s) => s.complete).length,
    artifacts: artifactSnapshots,
    policyVersion: policy?.version || null,
  };

  // Hash the proof for tamper detection.
  const proofHash = sha256HexFromString(stableStringify(proofData));

  return {
    ...proofData,
    proofHash,
  };
}
