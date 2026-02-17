import cpmaiPlan from "../../data/cpmai-template.json";
import { randomUUID } from "../../utils/uuid.js";
import { findTemplateLegacyByPhaseAndName } from "../../modules/templateRegistry/index.js";
import { RULE_ENGINE_VERSION } from "../../engine/version.js";

export const CPMAI_PLAN_ID = "cpmai";
export const CPMAI_PLAN_VERSION = "1.0.0";

// CPMAI is a preloaded plan bundle, not an engine-canonical shape.
export function buildNewCpmaiProject(name, deviceId, governanceMode = "team") {
  const now = new Date().toISOString();
  const normalizedMode = governanceMode === "solo" ? "solo" : "team";
  const ownerId = `owner:${deviceId || "laptop"}`;

  return {
    schemaVersion: 1,
    schema_version: "1",
    plan: { id: CPMAI_PLAN_ID, version: CPMAI_PLAN_VERSION },
    plan_id: CPMAI_PLAN_ID,
    plan_version: CPMAI_PLAN_VERSION,
    id: randomUUID(),
    name,
    description: "",
    governance_mode: normalizedMode,
    project_owner: ownerId,
    template_set_profile: normalizedMode === "solo" ? "minimum-compliance" : "standard",
    created: now,
    lastModified: now,
    lastSavedFrom: deviceId || "laptop",
    meta: {
      schema_version: "1",
      rule_engine_version: RULE_ENGINE_VERSION,
      normalized_at: now,
    },
    phases: (cpmaiPlan.phases || []).map((phase) => ({
      id: phase.id,
      name: phase.name,
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
        ...(findTemplateLegacyByPhaseAndName(phase.id, artifact.name)
          ? (() => {
              const t = findTemplateLegacyByPhaseAndName(phase.id, artifact.name);
              return {
                template_id: t.template_id,
                template_version: t.template_version,
                template_hash: t.template_hash,
                field_values: {},
              };
            })()
          : { template_id: null, template_version: null, template_hash: null, field_values: {} }),
        rationale: "",
        notes: "",
        comments: [],
        lastModified: now,
        waiver: null,
      })),
    })),
  };
}
