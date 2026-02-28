/**
 * Shared project normalization logic.
 * Single source of truth used by both ProjectContext and importExport.
 */

import { randomUUID } from "./uuid.js";
import { findTemplateLegacyByPhaseAndName } from "../modules/templateRegistry/index.js";
import { RULE_ENGINE_VERSION } from "../engine/version.js";
import { DEFAULT_POLICY } from "../kernel/policySchema.js";

export function isIso8601(value) {
  if (typeof value !== "string") return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString() === value;
}

export function normalizeProject(project) {
  if (!project || typeof project !== "object") return project;
  const nowIso = new Date().toISOString();
  const mode = project.governance_mode === "solo" ? "solo" : "team";
  const planIdRaw =
    typeof project?.plan?.id === "string" && project.plan.id.trim().length > 0
      ? project.plan.id.trim()
      : typeof project.plan_id === "string" && project.plan_id.trim().length > 0
      ? project.plan_id.trim()
      : typeof project.planId === "string" && project.planId.trim().length > 0
      ? project.planId.trim()
      : "cpmai";
  const planVersionRaw =
    typeof project?.plan?.version === "string" && project.plan.version.trim().length > 0
      ? project.plan.version.trim()
      : typeof project.plan_version === "string" && project.plan_version.trim().length > 0
      ? project.plan_version.trim()
      : null;
  const planId = planIdRaw;
  const ownerId =
    typeof project.project_owner === "string" && project.project_owner.trim().length > 0
      ? project.project_owner
      : `owner:${project.lastSavedFrom || "unknown-device"}`;

  const normalizeTemplateSetProfile = (value) => {
    const fallback = mode === "solo" ? "minimum-compliance" : "standard";
    if (typeof value === "string") {
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : fallback;
    }
    if (!value || typeof value !== "object") return fallback;

    // Preferred object form (future-friendly).
    if (typeof value.profile === "string" && value.profile.trim().length > 0) {
      return value.profile.trim();
    }

    // Legacy bug: spreading a string into an object produces { "0":"m","1":"i",... }.
    const keys = Object.keys(value).filter((k) => /^\d+$/.test(k));
    if (keys.length > 0) {
      const sorted = keys.map(Number).sort((a, b) => a - b);
      const chars = sorted.map((k) => String(value[String(k)] ?? ""));
      const reconstructed = chars.join("").trim();
      return reconstructed.length > 0 ? reconstructed : fallback;
    }

    return fallback;
  };

  const templateSetProfile = normalizeTemplateSetProfile(project.template_set_profile);
  const templateRegistryVersion =
    project?.template_set_profile &&
    typeof project.template_set_profile === "object" &&
    typeof project.template_set_profile.registry_version === "string"
      ? project.template_set_profile.registry_version
      : project?.template_registry_version;

  const normalizedPhases = (project.phases || []).map((phase) => {
    const inferredPhaseNumber =
      Number.isInteger(phase?.phase_number) && phase.phase_number >= 1
        ? phase.phase_number
        : Number.isInteger(phase?.id) && phase.id >= 1
        ? phase.id
        : null;

    return {
      ...phase,
      phase_number: inferredPhaseNumber ?? phase?.phase_number,
      goNoGoDecision: {
        status: "pending",
        decidedAt: null,
        notes: "",
        ...(phase?.goNoGoDecision || {}),
        attestation_type:
          mode === "solo"
            ? "solo_attestation"
            : phase?.goNoGoDecision?.attestation_type === "solo_attestation"
            ? "team_decision"
            : phase?.goNoGoDecision?.attestation_type || "team_decision",
      },
      artifacts: (phase?.artifacts || []).map((artifact) => {
      // Drop legacy manual status field; status is computed.
      // If a legacy project used status="not-required", it is migrated into waiver below.
      const { status: _legacyStatus, ...rest } = artifact || {};

      const nextFieldValues =
        artifact?.field_values && typeof artifact.field_values === "object" && !Array.isArray(artifact.field_values)
          ? artifact.field_values
          : artifact?.templateData && typeof artifact.templateData === "object" && !Array.isArray(artifact.templateData)
          ? artifact.templateData
          : {};

      // Template binding migration (best-effort) for CPMAI plan.
      const phaseNumber = inferredPhaseNumber ?? phase?.id;
      const legacyTemplate =
        planId === "cpmai" && phaseNumber
          ? findTemplateLegacyByPhaseAndName(phaseNumber, rest?.name)
          : null;

      const template_id =
        typeof rest?.template_id === "string" && rest.template_id.trim().length > 0
          ? rest.template_id.trim()
          : legacyTemplate?.template_id || null;
      const template_version =
        rest?.template_version != null && String(rest.template_version).trim().length > 0
          ? String(rest.template_version)
          : legacyTemplate?.template_version || null;
      const template_hash =
        typeof rest?.template_hash === "string" && rest.template_hash.trim().length > 0
          ? rest.template_hash.trim()
          : legacyTemplate?.template_hash || null;

        return {
          ...rest,
          phase_id:
            typeof rest?.phase_id === "string" && rest.phase_id.trim().length > 0
              ? rest.phase_id.trim()
              : phase?.id,
          template_id,
          template_version,
          template_hash,
          field_values: nextFieldValues,
          // Migrate legacy manual status waiver into explicit waiver object.
          waiver:
            artifact?.waiver && typeof artifact.waiver === "object"
              ? {
              waived: artifact.waiver.waived === true,
              rationale:
                typeof artifact.waiver.rationale === "string"
                  ? artifact.waiver.rationale
                  : "",
              waived_at:
                typeof artifact.waiver.waived_at === "string" && isIso8601(artifact.waiver.waived_at)
                  ? artifact.waiver.waived_at
                  : null,
              waived_by:
                typeof artifact.waiver.waived_by === "string" && artifact.waiver.waived_by.trim().length > 0
                  ? artifact.waiver.waived_by
                  : null,
              }
              : artifact?.status === "not-required"
              ? {
              waived: true,
              rationale: typeof artifact?.rationale === "string" ? artifact.rationale : "",
              waived_at:
                typeof artifact?.lastModified === "string" && isIso8601(artifact.lastModified)
                  ? artifact.lastModified
                  : project.lastModified || new Date().toISOString(),
              waived_by: artifact?.assigned_to || ownerId,
              }
              : null,
          assigned_to: artifact?.assigned_to || ownerId,
          comments: (artifact?.comments || []).map((comment) => ({
        id: comment?.id || randomUUID(),
        comment_type: ["advisory", "self-critique", "future-review"].includes(
          comment?.comment_type
        )
          ? comment.comment_type
          : "advisory",
        content: typeof comment?.content === "string" ? comment.content : "",
        status: comment?.status === "resolved" ? "resolved" : "open",
        created_at:
          typeof comment?.created_at === "string" && isIso8601(comment.created_at)
            ? comment.created_at
            : project.created || new Date().toISOString(),
        created_by:
          typeof comment?.created_by === "string" && comment.created_by.trim().length > 0
            ? comment.created_by
            : ownerId,
        resolved_at:
          comment?.status === "resolved" &&
          typeof comment?.resolved_at === "string" &&
          isIso8601(comment.resolved_at)
            ? comment.resolved_at
            : null,
        resolved_by:
          comment?.status === "resolved" &&
          typeof comment?.resolved_by === "string" &&
          comment.resolved_by.trim().length > 0
            ? comment.resolved_by
            : null,
          })),
        };
      }),
    };
  });

  return {
    ...project,
    governance_mode: mode,
    // Plan is versioned and optional; keep legacy plan_id for backward compatibility.
    plan: {
      id: planId,
      ...(planVersionRaw ? { version: planVersionRaw } : {}),
    },
    plan_id: planId,
    ...(planVersionRaw ? { plan_version: planVersionRaw } : {}),
    project_owner: ownerId,
    template_set_profile: templateSetProfile,
    // Preserve version metadata if a legacy payload stored it inside template_set_profile.
    ...(templateRegistryVersion ? { template_registry_version: templateRegistryVersion } : {}),
    // Engine metadata is persisted for auditability; callers may recompute/overwrite on save/export.
    meta: {
      ...(project.meta && typeof project.meta === "object" && !Array.isArray(project.meta) ? project.meta : {}),
      schema_version:
        typeof project?.meta?.schema_version === "string" && project.meta.schema_version.trim().length > 0
          ? project.meta.schema_version.trim()
          : typeof project?.schema_version === "string" && project.schema_version.trim().length > 0
          ? project.schema_version.trim()
          : typeof project?.schemaVersion === "number"
          ? String(project.schemaVersion)
          : "1",
      rule_engine_version: RULE_ENGINE_VERSION,
      normalized_at:
        typeof project?.meta?.normalized_at === "string" && isIso8601(project.meta.normalized_at)
          ? project.meta.normalized_at
          : nowIso,
    },
    audit_log: Array.isArray(project.audit_log) ? project.audit_log : [],
    ledger: Array.isArray(project.ledger) ? project.ledger : [],
    policy: project.policy && typeof project.policy === "object" && !Array.isArray(project.policy)
      ? project.policy
      : { ...DEFAULT_POLICY },
    phases: normalizedPhases,
    // OpenClaw integration namespace — advisory only, never touches phases/artifacts.
    // Defaults first; existing data spreads on top so re-normalization never resets agent registrations.
    openclaw: {
      linkedAgentIds: [],
      lastAgentHeartbeat: null,
      advisoryDrafts: {},
      ...(project.openclaw && typeof project.openclaw === "object" ? project.openclaw : {}),
    },
  };
}
