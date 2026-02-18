import { CURRENT_SCHEMA_VERSION } from "../migrations/index.js";

export const EXPORT_BUNDLE_SCHEMA_VERSION = 1;

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

export function wrapProjectInBundle(project, { createdAt, appVersion } = {}) {
  if (!project || typeof project !== "object") {
    throw new Error("wrapProjectInBundle: project must be an object.");
  }
  const iso = createdAt || new Date().toISOString();
  return {
    schemaVersion: EXPORT_BUNDLE_SCHEMA_VERSION,
    minReaderVersion: CURRENT_SCHEMA_VERSION,
    createdAt: iso,
    ...(appVersion ? { appVersion } : {}),
    project,
  };
}

export function isExportBundle(value) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    value.schemaVersion === EXPORT_BUNDLE_SCHEMA_VERSION &&
    Boolean(value.project) &&
    typeof value.project === "object"
  );
}

export function unwrapImportedPayload(value) {
  if (isExportBundle(value)) {
    return {
      kind: "bundle",
      schemaVersion: value.schemaVersion,
      createdAt: value.createdAt,
      appVersion: value.appVersion,
      project: value.project,
    };
  }
  return { kind: "project", project: value };
}

export function buildBundleFilename(bundle) {
  if (!bundle || typeof bundle !== "object") {
    throw new Error("buildBundleFilename: bundle must be an object.");
  }
  const projectName =
    bundle?.project?.name || bundle?.project?.id || "project";
  const projectSlug = slugify(projectName) || "project";
  const createdAt = String(bundle.createdAt || "");
  const date = /^\d{4}-\d{2}-\d{2}/.test(createdAt)
    ? createdAt.slice(0, 10)
    : new Date().toISOString().slice(0, 10);
  return `thingstead-project_${projectSlug}_${date}.json`;
}
