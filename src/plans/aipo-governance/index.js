import aipoPlan from "../../data/aipo-template.json";
import { randomUUID } from "../../utils/uuid.js";
import { RULE_ENGINE_VERSION } from "../../engine/version.js";

export const AIPO_PLAN_ID = "aipo-governance";
export const AIPO_PLAN_VERSION = "1.0.0";

/**
 * Default approval roles assigned to gate records.
 * Non-gate artifacts receive a subset (Executive Sponsor + Project Manager).
 */
const GATE_RECORD_APPROVAL_ROLES = [
  "EXEC_SPONSOR",
  "SYS_OWNER",
  "GOV_AUTHORITY",
  "SEC_AUTHORITY",
  "PROJECT_MGR",
];

const STANDARD_APPROVAL_ROLES = [
  "EXEC_SPONSOR",
  "PROJECT_MGR",
];

function buildApprovals(artifact) {
  const roles = artifact.isGateBlocking
    ? GATE_RECORD_APPROVAL_ROLES
    : STANDARD_APPROVAL_ROLES;

  return roles.map((role) => ({
    role,
    name: "",
    signedAt: null,
  }));
}

export function buildNewAipoProject(name, deviceId, governanceMode = "team") {
  const now = new Date().toISOString();
  const normalizedMode = governanceMode === "solo" ? "solo" : "team";
  const ownerId = `owner:${deviceId || "laptop"}`;

  return {
    schemaVersion: 1,
    schema_version: "1",
    plan: { id: AIPO_PLAN_ID, version: AIPO_PLAN_VERSION },
    plan_id: AIPO_PLAN_ID,
    plan_version: AIPO_PLAN_VERSION,
    id: randomUUID(),
    name,
    description: "",
    governance_mode: normalizedMode,
    project_owner: ownerId,
    template_set_profile: normalizedMode === "solo" ? "minimum-compliance" : "standard",
    classification_level: "INTERNAL",
    created: now,
    lastModified: now,
    lastSavedFrom: deviceId || "laptop",
    meta: {
      schema_version: "1",
      rule_engine_version: RULE_ENGINE_VERSION,
      normalized_at: now,
    },
    phases: (aipoPlan.phases || []).map((phase) => ({
      id: phase.id,
      name: phase.name,
      code: phase.code,
      color: phase.color,
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
        // AIPO-specific deep integration fields
        approvals: buildApprovals(artifact),
        doc_status: "DRAFT",
        doc_versions: [
          { version: "1.0", createdAt: now, notes: "Initial draft" },
        ],
      })),
    })),
    audit_log: [],
  };
}
