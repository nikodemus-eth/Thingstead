import { normalizeProject } from "../utils/normalizeProject.js";

export const CURRENT_SCHEMA_VERSION = "1";

const MIGRATORS = [
  { from: "0", to: "1", migrate: normalizeProject },
];

function detectVersion(project) {
  if (project?.meta?.schema_version) return project.meta.schema_version;
  if (typeof project?.schema_version === "string") return project.schema_version;
  if (typeof project?.schemaVersion === "number") return String(project.schemaVersion);
  return "0";
}

export function migrateProject(project) {
  if (!project || typeof project !== "object") return null;

  const sourceVersion = detectVersion(project);
  if (sourceVersion === CURRENT_SCHEMA_VERSION) {
    const normalized = normalizeProject(project);
    return normalized;
  }

  let current = project;
  let version = sourceVersion;

  for (const step of MIGRATORS) {
    if (step.from === version) {
      current = step.migrate(current);
      version = step.to;
    }
  }

  return {
    ...current,
    meta: {
      ...(current.meta || {}),
      schema_version: CURRENT_SCHEMA_VERSION,
      migrated_from: sourceVersion,
    },
  };
}
