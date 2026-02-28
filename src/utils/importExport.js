import { normalizeProject } from "./normalizeProject.js";
import { migrateProject } from "../migrations/index.js";
import { validateImportedProject } from "./validation/validateImportedProject.js";
import { computeProjectIntegrity, signProject } from "./projectIntegrity.js";
import {
  wrapProjectInBundle,
  unwrapImportedPayload,
  buildBundleFilename,
} from "./exportBundle.js";

function downloadJson(filename, jsonString) {
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function buildExportProjectPayload(project) {
  const normalized = normalizeProject(project);
  // Embed integrity + optional signature for auditability.
  const integrity = computeProjectIntegrity(normalized);
  const signature = await signProject({ ...normalized, integrity });
  const withIntegrity = {
    ...normalized,
    integrity: signature ? { ...integrity, signature } : integrity,
  };
  return withIntegrity;
}

export async function buildExportBundle(project, { createdAt, appVersion } = {}) {
  const projectPayload = await buildExportProjectPayload(project);
  const inferredAppVersion =
    appVersion || import.meta?.env?.VITE_APP_VERSION || undefined;
  return wrapProjectInBundle(projectPayload, { createdAt, appVersion: inferredAppVersion });
}

export async function exportProject(project) {
  const bundle = await buildExportBundle(project);
  const filename = buildBundleFilename(bundle);
  const jsonString = JSON.stringify(bundle, null, 2);
  downloadJson(filename, jsonString);
  return jsonString;
}

export function validateImport(jsonString) {
  let project = null;
  try {
    const parsed = JSON.parse(jsonString);
    if (
      parsed &&
      typeof parsed === "object" &&
      Object.prototype.hasOwnProperty.call(parsed, "schemaVersion") &&
      Object.prototype.hasOwnProperty.call(parsed, "project")
    ) {
      if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2) {
        return {
          valid: false,
          errors: [`Unsupported export bundle schemaVersion: ${parsed.schemaVersion}`],
          warnings: [],
          project: null,
        };
      }
    }
    const unwrapped = unwrapImportedPayload(parsed);
    project = unwrapped.project;
  } catch {
    return { valid: false, errors: ["Invalid JSON."], warnings: [], project: null };
  }

  const out = validateImportedProject(project, {
    // Migration default. Plan-specific constraints are opt-in.
    defaultPlanId: "cpmai",
    enforcePlanValidation: false,
  });

  return {
    valid: out.ok,
    errors: out.errors,
    warnings: out.warnings,
    project: out.project ? migrateProject(out.project) : null,
  };
}

export function importProject(jsonString, existingProjects, opts = {}) {
  let parsed = null;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return { status: "invalid", project: null, errors: ["Invalid JSON."], warnings: [] };
  }

  const unwrapped = unwrapImportedPayload(parsed);
  const projectPayload = unwrapped.project;
  if (
    unwrapped.kind === "bundle" &&
    parsed &&
    typeof parsed === "object" &&
    parsed.schemaVersion !== 1 && parsed.schemaVersion !== 2
  ) {
    return {
      status: "invalid",
      project: null,
      errors: [`Unsupported export bundle schemaVersion: ${parsed.schemaVersion}`],
      warnings: [],
    };
  }

  const validation = validateImportedProject(projectPayload, {
    defaultPlanId: "cpmai",
    enforcePlanValidation: Boolean(opts.enforcePlanValidation),
    strict: Boolean(opts.strict),
    failFast: Boolean(opts.failFast),
    strictImportDiff: Boolean(opts.strictImportDiff),
  });

  if (!validation.ok) {
    return { status: "invalid", project: null, errors: validation.errors, warnings: validation.warnings };
  }

  const project = validation.project ? migrateProject(validation.project) : validation.project;
  const collision =
    project &&
    existingProjects &&
    Object.prototype.hasOwnProperty.call(existingProjects, project.id);

  if (collision) {
    return { status: "collision", project, errors: [], warnings: validation.warnings };
  }

  return { status: "success", project, errors: [], warnings: validation.warnings };
}

export function exportProjectToPDF() {
  // Phase 1 deferred - implement in Phase 2
  return Promise.reject(new Error("Not implemented"));
}
