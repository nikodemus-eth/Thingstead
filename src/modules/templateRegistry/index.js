import templateRegistryJson from "../../data/template-registry.json";
import { stableHashObject } from "../../utils/templateHash.js";

// Module namespace for the template registry.
// Centralizing the registry import here avoids sprinkling JSON import paths across the codebase.
export const templateRegistry = templateRegistryJson;

export function getAllTemplateIds() {
  return Object.keys(templateRegistry?.templates || {});
}

export function getTemplateVersion(templateId, templateVersion) {
  if (!templateId || !templateVersion) return null;
  const t = templateRegistry?.templates?.[templateId];
  const v = t?.versions?.[String(templateVersion)];
  return v || null;
}

export function getLatestTemplateVersion(templateId) {
  const t = templateRegistry?.templates?.[templateId];
  const versions = t?.versions ? Object.keys(t.versions) : [];
  if (versions.length === 0) return null;
  // Prefer semver-ish numeric sort when possible, else lexical.
  const sorted = versions.slice().sort((a, b) => {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na - nb;
    return a.localeCompare(b);
  });
  return t.versions[sorted[sorted.length - 1]] || null;
}

function pickForHash(versionObj) {
  const {
    template_hash: _templateHash,
    status: _status,
    estimatedCompletionMinutes: _estimated,
    ...rest
  } = versionObj || {};
  return rest;
}

export function verifyTemplateHash(templateVersionObj) {
  if (!templateVersionObj) return { ok: false, reason: "missing-template" };
  if (!templateVersionObj.template_hash) return { ok: false, reason: "missing-hash" };
  const computed = stableHashObject(pickForHash(templateVersionObj));
  if (computed !== templateVersionObj.template_hash) {
    return { ok: false, reason: "hash-mismatch", computed };
  }
  return { ok: true };
}

// Legacy lookup: used for migrating pre-binding projects or building legacy artifacts.
export function findTemplateLegacyByPhaseAndName(phaseNumber, artifactName) {
  if (!artifactName) return null;
  const phaseNum = Number(phaseNumber);
  for (const templateId of getAllTemplateIds()) {
    const latest = getLatestTemplateVersion(templateId);
    if (!latest) continue;
    if (Number(latest.phase_number) === phaseNum && latest.name === artifactName) return latest;
  }
  return null;
}
