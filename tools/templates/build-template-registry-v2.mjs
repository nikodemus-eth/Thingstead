import fs from "node:fs";
import path from "node:path";
import { stableHashObject } from "../../src/utils/templateHash.js";

const root = path.resolve(process.cwd());
const inputPath = path.join(root, "src", "data", "cpmai-template-registry.json");
const outputPath = path.join(root, "src", "data", "template-registry.json");

function pickForHash(version) {
  // Hash over the parts that define the meaning of the template for governance and completion.
  // Exclude operational metadata that might change without a new schema version.
  const {
    template_hash: _templateHash,
    status: _status,
    estimatedCompletionMinutes: _estimated,
    ...rest
  } = version;
  return rest;
}

const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const out = {
  registryVersion: raw.registryVersion || "1.0",
  registryStatus: raw.registryStatus || "draft",
  lastUpdated: raw.lastUpdated || null,
  methodology: raw.methodology || null,
  authoringPlaybookVersion: raw.authoringPlaybookVersion || null,
  description: raw.description || null,
  fieldTypes: raw.fieldTypes || {},
  templates: {},
};

const templates = raw.templates || {};
for (const [key, t] of Object.entries(templates)) {
  const templateId = (t && (t.templateId || t.template_id)) || key;
  const version = (t && (t.version || t.template_version)) || "1.0";

  const versionObj = {
    template_id: templateId,
    template_version: version,
    name: t.name,
    phase_number: Number(t.phase),
    phase_name: t.phaseName,
    category: t.category,
    isGateBlocking: Boolean(t.isGateBlocking),
    description: t.description || "",
    fields: Array.isArray(t.fields) ? t.fields : [],
    // Keep existing metadata for display/auditing, but excluded from hash.
    estimatedCompletionMinutes: t.estimatedCompletionMinutes,
    status: t.status,
  };

  versionObj.template_hash = stableHashObject(pickForHash(versionObj));

  out.templates[templateId] = out.templates[templateId] || {
    template_id: templateId,
    versions: {},
  };
  out.templates[templateId].versions[version] = versionObj;
}

fs.writeFileSync(outputPath, JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(`Wrote ${outputPath}`);

