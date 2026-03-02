/**
 * Shared project builder utilities for plan implementations.
 *
 * Waterfall and Agile builders share 95% of their project structure.
 * This module extracts the common shape so plan builders only specify
 * their template data, plan metadata, track, and any phase-level extras.
 */

import { randomUUID } from "../utils/uuid.js";
import { RULE_ENGINE_VERSION } from "../engine/version.js";
import { compilePolicyForTrack } from "../kernel/policy.js";

/**
 * Builds a new project from plan template data.
 *
 * @param {Object} opts
 * @param {Object} opts.template - Template data (phases + artifacts from JSON).
 * @param {string} opts.planId - Plan identifier (e.g., "pmi-waterfall").
 * @param {string} opts.planVersion - Plan version (e.g., "1.0.0").
 * @param {string} opts.track - GovernanceTrack value (e.g., "PMI_WATERFALL").
 * @param {string} opts.name - Project name.
 * @param {string} opts.deviceId - Device identifier.
 * @param {string} [opts.governanceMode="team"] - "team" or "solo".
 * @param {Function} [opts.phaseExtras] - (phase) => extra fields merged into each phase.
 * @returns {Object} Complete project object ready for storage.
 */
export function buildProjectFromTemplate({
  template,
  planId,
  planVersion,
  track,
  name,
  deviceId,
  governanceMode = "team",
  phaseExtras,
}) {
  const now = new Date().toISOString();
  const normalizedMode = governanceMode === "solo" ? "solo" : "team";
  const ownerId = `owner:${deviceId || "laptop"}`;
  const { policy } = compilePolicyForTrack(track);

  return {
    schemaVersion: 1,
    schema_version: "1",
    plan: { id: planId, version: planVersion },
    plan_id: planId,
    plan_version: planVersion,
    track,
    id: randomUUID(),
    name,
    description: "",
    governance_mode: normalizedMode,
    project_owner: ownerId,
    template_set_profile: normalizedMode === "solo" ? "minimum-compliance" : "standard",
    policy,
    created: now,
    lastModified: now,
    lastSavedFrom: deviceId || "laptop",
    meta: {
      schema_version: "1",
      rule_engine_version: RULE_ENGINE_VERSION,
      normalized_at: now,
    },
    phases: (template.phases || []).map((phase) => ({
      id: phase.id,
      name: phase.name,
      code: phase.code,
      color: phase.color,
      ...(phaseExtras ? phaseExtras(phase) : {}),
      goNoGoDecision: {
        status: "pending",
        decidedAt: null,
        notes: "",
        attestation_type:
          normalizedMode === "solo" ? "solo_attestation" : "team_decision",
      },
      artifacts: (phase.artifacts || []).map((artifact) => ({
        id: randomUUID(),
        name: artifact.name,
        category: artifact.category,
        isGateBlocking: artifact.isGateBlocking,
        assigned_to: ownerId,
        phase_id: phase.id,
        template_id: artifact.templateSlug || null,
        template_version: null,
        template_hash: null,
        field_values: {},
        status: "not-started",
        rationale: "",
        notes: "",
        comments: [],
        lastModified: now,
        waiver: null,
      })),
    })),
    audit_log: [],
    ledger: [],
  };
}
