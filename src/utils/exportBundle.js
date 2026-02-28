import { CURRENT_SCHEMA_VERSION } from "../migrations/index.js";
import { verifyLedgerIntegrity } from "../kernel/ledger.js";
import { hashPolicy } from "../kernel/policySchema.js";
import { sha256HexFromString, stableStringify } from "../kernel/hash.js";

export const EXPORT_BUNDLE_SCHEMA_VERSION = 2;

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "")
    .replace(/-+/g, "-")
    .replace(/^[-_]+|[-_]+$/g, "");
}

/**
 * Builds the sovereignty block for a v2 export.
 * Declares the export as a self-describing, zero-dependency governance package.
 */
function buildSovereigntyBlock() {
  return {
    format: "thingstead-sovereignty-v2",
    self_describing: true,
    runtime_dependencies: [],
    exit_guarantee: "This file contains all governance data needed to reconstruct project state without Thingstead.",
  };
}

/**
 * Builds the verification block for a v2 export.
 * Contains hashes of all major data sections for integrity verification.
 */
function buildVerificationBlock(project) {
  const ledger = Array.isArray(project.ledger) ? project.ledger : [];
  const policy = project.policy || null;
  const auditLog = Array.isArray(project.audit_log) ? project.audit_log : [];

  const ledgerIntegrity = verifyLedgerIntegrity(ledger);
  const ledgerHash = ledger.length > 0
    ? sha256HexFromString(stableStringify(ledger))
    : null;
  const policyHash = policy ? hashPolicy(policy) : null;
  const auditLogHash = auditLog.length > 0
    ? sha256HexFromString(stableStringify(auditLog))
    : null;

  return {
    ledger: {
      entries: ledger.length,
      valid: ledgerIntegrity.valid,
      hash: ledgerHash,
    },
    policy: {
      version: policy?.version || null,
      hash: policyHash,
    },
    audit_log: {
      entries: auditLog.length,
      hash: auditLogHash,
    },
  };
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
    sovereignty: buildSovereigntyBlock(),
    verification: buildVerificationBlock(project),
    project,
  };
}

export function isExportBundle(value) {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    typeof value.schemaVersion === "number" &&
    value.schemaVersion >= 1 &&
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
      sovereignty: value.sovereignty || null,
      verification: value.verification || null,
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
