import { isIso8601, normalizeProject } from "../normalizeProject.js";
import { diffJson } from "../canonicalJson.js";
import { getPlan } from "../../plans/registry.js";

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isPositiveInt(value) {
  return Number.isInteger(value) && value >= 1;
}

function toKey(value) {
  if (value === null || value === undefined) return "";
  return String(value);
}

function getSchemaVersionString(project) {
  // Legacy: schemaVersion number.
  if (typeof project?.schemaVersion === "number") return String(project.schemaVersion);
  if (typeof project?.schema_version === "string") return project.schema_version;
  // Normalized projects store version in meta.schema_version.
  if (typeof project?.meta?.schema_version === "string") return project.meta.schema_version;
  return "";
}

function getPlanId(project, opts) {
  const fromProject = project?.plan?.id ?? project?.plan_id ?? project?.planId;
  if (isNonEmptyString(fromProject)) return String(fromProject).trim();
  const fallback = opts?.defaultPlanId || "cpmai";
  return fallback;
}

export function recomputeAllArtifactStatuses(project) {
  // Artifact status is computed at runtime. Deterministic safety: strip any persisted status fields.
  const phases = project?.phases || [];
  phases.forEach((phase) => {
    (phase?.artifacts || []).forEach((artifact) => {
      if (artifact && typeof artifact === "object" && "status" in artifact) {
        delete artifact.status;
      }
    });
  });
}

export function validateCoreProject(project, ctx = {}) {
  const errors = ctx.errors || [];
  const warnings = ctx.warnings || [];
  const opts = ctx.opts || {};
  const strict = opts.strict === true;
  const failFast = opts.failFast === true;

  const FAIL_FAST = "__FAIL_FAST__";
  const addError = (message) => {
    errors.push(message);
    if (failFast) throw new Error(FAIL_FAST);
  };

  const warnOrError = (message) => {
    if (strict) addError(message);
    else warnings.push(message);
  };

  try {
    if (!project || typeof project !== "object") {
      addError("Project payload is not an object.");
      return;
    }

  const schemaVersion = getSchemaVersionString(project);
  if (!schemaVersion) {
    addError("Project.schema_version (or schemaVersion) is missing.");
  } else if (!["1"].includes(schemaVersion)) {
    addError(`Unsupported schema_version: ${schemaVersion}.`);
  }

  if (!isNonEmptyString(project.id)) {
    // Legacy projects used UUID strings; enforce string to avoid key instability.
    addError("Project.id must be a non-empty string.");
  }

  if (!isNonEmptyString(project.name)) {
    addError("Project.name must be a non-empty string.");
  }

  if (!Array.isArray(project.phases) || project.phases.length < 1) {
    addError("Project.phases must be an array with length >= 1.");
    return;
  }

  // Backward-compatible migration: default plan_id but do not enforce profile constraints in Tier A.
  const planId = getPlanId(project, ctx.opts);
  if (!isNonEmptyString(project.plan_id) && !isNonEmptyString(project?.plan?.id)) {
    warnOrError(`Project.plan_id (or plan.id) missing; would default to '${planId}'.`);
  }

  const phaseIds = new Set();
  const phaseNumbers = new Set();

  const phases = project.phases;
  const normalizedPhases = [];
  phases.forEach((phase, index) => {
    if (!phase || typeof phase !== "object") {
      addError(`Phase at index ${index} is invalid.`);
      return;
    }

    const phaseIdKey = toKey(phase.id).trim();
    if (!phaseIdKey) {
      addError(`Phase at index ${index} is missing id.`);
    } else {
      if (phaseIds.has(phaseIdKey)) addError(`Duplicate phase id: ${phaseIdKey}.`);
      phaseIds.add(phaseIdKey);
    }

    if (!isNonEmptyString(phase.name)) {
      addError(`Phase ${phaseIdKey || `at index ${index}`} is missing a name.`);
    }

    // phase_number: required by Tier A. For legacy payloads, infer from numeric id when possible.
    let phaseNumber = phase.phase_number;
    if (phaseNumber === undefined) addError(`Phase ${phaseIdKey || `at index ${index}`} is missing phase_number.`);
    if (phaseNumber !== undefined && !isPositiveInt(phaseNumber)) {
      addError(`Phase ${phaseIdKey || `at index ${index}`} phase_number must be an integer >= 1.`);
    } else if (phaseNumber !== undefined) {
      const numKey = String(phaseNumber);
      if (phaseNumbers.has(numKey)) addError(`Duplicate phase_number: ${numKey}.`);
      phaseNumbers.add(numKey);
    }

    // Gate decision referential + integrity (nested form).
    const decision = phase.goNoGoDecision;
    if (decision && typeof decision === "object") {
      const status = decision.status;
      if (status && !["pending", "go", "no-go"].includes(status)) {
        addError(`Invalid gate decision status for phase ${phaseIdKey}: ${status}.`);
      }
      const decidedAt = decision.decidedAt;
      if (status === "go" || status === "no-go") {
        if (!isNonEmptyString(decidedAt) || !isIso8601(decidedAt)) {
          addError(`Phase ${phaseIdKey} decidedAt must be ISO8601 when status is ${status}.`);
        }
      }
      if (status === "pending") {
        if (decidedAt !== null && decidedAt !== undefined && decidedAt !== "") {
          addError(`Phase ${phaseIdKey} decidedAt must be null/absent when status is pending.`);
        }
      }
    }

    normalizedPhases.push(phase);
  });

  // Artifact referential integrity (nested form). Ensure unique ids across project.
  const artifactIds = new Set();
  const artifactIdsByPhase = new Map();
  for (const phase of normalizedPhases) {
    artifactIdsByPhase.set(toKey(phase.id), new Set());
  }

  normalizedPhases.forEach((phase) => {
    const phaseKey = toKey(phase.id);
    if (!Array.isArray(phase.artifacts)) {
      addError(`Phase ${phaseKey} artifacts must be an array.`);
      return;
    }
    phase.artifacts.forEach((artifact, index) => {
      if (!artifact || typeof artifact !== "object") {
        addError(`Invalid artifact in phase ${phaseKey} at index ${index}.`);
        return;
      }

      if (!isNonEmptyString(artifact.id)) {
        addError(`Artifact in phase ${phaseKey} is missing id.`);
      } else {
        if (artifactIds.has(artifact.id)) addError(`Duplicate artifact id: ${artifact.id}.`);
        artifactIds.add(artifact.id);
        artifactIdsByPhase.get(phaseKey)?.add(artifact.id);
      }

      // Nested placement defines phase binding; set phase_id for forward compatibility.
      if (!isNonEmptyString(artifact.phase_id)) {
        warnOrError(`Artifact ${artifact.id || artifact.name || "(unknown)"} missing phase_id; would default to ${phaseKey}.`);
      } else if (toKey(artifact.phase_id) !== phaseKey) {
        addError(
          `Artifact ${artifact.id || artifact.name || "(unknown)"} references phase_id ${toKey(
            artifact.phase_id
          )} but is nested under phase ${phaseKey}.`
        );
      }

      // Template binding: new shape requires template_id/version/field_values. Legacy shape uses name + templateData.
      if (!isNonEmptyString(artifact.template_id)) {
        warnOrError(`Artifact ${artifact.id || artifact.name || "(unknown)"} missing template_id.`);
      }
      if (artifact.template_version === undefined || artifact.template_version === null || artifact.template_version === "") {
        warnOrError(`Artifact ${artifact.id || artifact.name || "(unknown)"} missing template_version.`);
      }

      const fieldValues = artifact.field_values ?? artifact.templateData;
      if (fieldValues === undefined) {
        warnOrError(`Artifact ${artifact.id || artifact.name || "(unknown)"} missing field_values.`);
      } else if (!fieldValues || typeof fieldValues !== "object" || Array.isArray(fieldValues)) {
        addError(`Artifact ${artifact.id || artifact.name || "(unknown)"} field_values must be an object.`);
      }

      // Comments: nested form; if resolved, require resolved_at/resolved_by.
      if (artifact.comments !== undefined) {
        if (!Array.isArray(artifact.comments)) {
          addError(`Artifact ${artifact.id || artifact.name || "(unknown)"} comments must be an array.`);
        } else {
          artifact.comments.forEach((comment, cIdx) => {
            if (!comment || typeof comment !== "object") {
              addError(`Invalid comment at index ${cIdx} for artifact ${artifact.id || artifact.name || "(unknown)"}.`);
              return;
            }
            if (comment.artifact_id !== undefined && comment.artifact_id !== null) {
              if (toKey(comment.artifact_id) !== toKey(artifact.id)) {
                addError(`Comment.artifact_id does not match containing artifact id for artifact ${toKey(artifact.id)}.`);
              }
            }
            if (!["open", "resolved"].includes(comment.status)) {
              addError(`Invalid comment status for artifact ${artifact.id || artifact.name || "(unknown)"}.`);
            }
            if (comment.status === "resolved") {
              if (!isNonEmptyString(comment.resolved_by)) {
                addError(`Resolved comment missing resolved_by for artifact ${artifact.id || artifact.name || "(unknown)"}.`);
              }
              if (!isNonEmptyString(comment.resolved_at) || !isIso8601(comment.resolved_at)) {
                addError(`Resolved comment missing valid resolved_at for artifact ${artifact.id || artifact.name || "(unknown)"}.`);
              }
            }
            if (comment.created_at !== undefined && comment.created_at !== null && comment.created_at !== "") {
              if (!isIso8601(comment.created_at)) {
                addError(`Comment created_at must be ISO8601 for artifact ${artifact.id || artifact.name || "(unknown)"}.`);
              }
            }
          });
        }
      }
    });
  });

  // Audit_log reference checks (optional).
  if (Array.isArray(project.audit_log)) {
    project.audit_log.forEach((event, idx) => {
      if (!event || typeof event !== "object") {
        addError(`Invalid audit_log entry at index ${idx}.`);
        return;
      }
      if (event.phase_id !== undefined && event.phase_id !== null) {
        const phaseKey = toKey(event.phase_id);
        if (!phaseIds.has(phaseKey)) {
          addError(`audit_log entry references unknown phase_id: ${phaseKey}.`);
          return;
        }
        if (event.artifact_id !== undefined && event.artifact_id !== null) {
          const artKey = toKey(event.artifact_id);
          const set = artifactIdsByPhase.get(phaseKey);
          if (set && !set.has(artKey)) {
            addError(`audit_log entry references unknown artifact_id: ${artKey}.`);
          }
        }
      }
    });
  }
  } catch (err) {
    if (err && typeof err === "object" && String(err.message) === FAIL_FAST) return;
    throw err;
  }
}

export function validatePlanProfile(planId, project, ctx) {
  const plan = getPlan(planId);
  if (!plan) {
    ctx.warnings.push(`Unknown plan_id '${planId}'. Imported with core validation only.`);
    return;
  }
  plan.validateProfile(project, ctx);
}

export function validateImportedProject(projectInput, opts = {}) {
  const errors = [];
  const warnings = [];

  // Normalize first (legacy migrations, deterministic shapes).
  const project = normalizeProject(projectInput);

  validateCoreProject(project, { errors, warnings, opts });

  const planId = getPlanId(project, { defaultPlanId: opts.defaultPlanId });
  if (opts.enforcePlanValidation) {
    validatePlanProfile(planId, project, { errors, warnings });
  }

  // Strict import diff: fail fast if the input differs from the normalized/canonical structure.
  // This prevents silent migrations during import and forces users to re-export from a trusted source.
  const importDiff =
    opts.strictImportDiff === true ? diffJson(projectInput, project, { maxDiffs: 50 }) : [];
  if (opts.strictImportDiff === true && importDiff.length > 0) {
    errors.push(
      `Import payload is not in canonical form (${importDiff.length} differing path(s)). Re-export a canonical project JSON before importing.`
    );
  }

  if (errors.length) return { ok: false, project: null, errors, warnings };

  recomputeAllArtifactStatuses(project);
  return { ok: true, project, errors: [], warnings, importDiff };
}
