# Template Registry Specification

The template registry is the single source of truth for all artifact field definitions in Thingstead. It is a schema-driven system: the JSON registry file defines what fields each artifact has, their types, validation rules, and help text. No code changes are required to add a new template — only JSON.

---

## 1. Registry Location

| Artifact | Path |
|----------|------|
| Registry JSON | `src/data/template-registry.json` |
| Registry module | `src/modules/templateRegistry/index.js` |
| Template helpers | `src/utils/templateHelpers.js` |

---

## 2. Registry Entry Structure

The registry is an object keyed by `template_id`. Each key maps to an array of versioned entries (one per version):

```jsonc
{
  "problem-definition-document": [
    {
      "template_id":      "problem-definition-document",
      "template_version": "1.0.0",
      "template_hash":    "sha256:...",

      "name":           "Problem Definition Document",
      "phase_number":   1,
      "phase_name":     "Business Understanding",
      "category":       "core",
      "isGateBlocking": true,
      "description":    "Narrative purpose of this artifact",

      "fields": TemplateField[]
    }
  ]
}
```

---

## 3. Template Field Object

```jsonc
{
  "fieldId":      string,    // Key used in artifact.field_values
  "label":        string,    // Human-readable label
  "type":         FieldType, // See §4
  "required":     boolean,   // true = must be satisfied for artifact completion
  "gateBlocking": boolean,   // true = required for phase gate unlock
  "helpText":     string,    // Guidance shown below the field in the editor

  // Type-specific (only present for applicable types):
  "validation":   { "minLength": number, "maxLength": number },  // short_text, long_text
  "options":      string[],     // selection
  "items":        string[],     // checklist
  "columns":      TableColumn[] // table
}
```

### Table Column Object

```jsonc
{
  "name":    string,
  "type":    "text" | "selection",
  "options": string[]  // only present when type === "selection"
}
```

---

## 4. Field Types

| Type | UI Control | `field_values` storage format | Satisfied when |
|------|-----------|-----------------------------|----------------|
| `short_text` | `<input type="text">` | `string` | Non-empty AND length >= `validation.minLength` |
| `long_text` | `<textarea>` | `string` | Non-empty AND length >= `validation.minLength` |
| `selection` | `<select>` | `string` (one of `options`) | Non-empty |
| `checklist` | Checkbox list | `string[]` (checked item labels) | Non-empty array |
| `table` | Editable multi-row table | `object[]` (rows keyed by column name) | >= 1 row with ALL columns non-empty |
| `date` | `<input type="date">` | `string` (ISO date `YYYY-MM-DD`) | Non-empty |

---

## 5. Registry Module API

```js
import {
  templateRegistry,
  getAllTemplateIds,
  getTemplateVersion,
  getLatestTemplateVersion,
  verifyTemplateHash,
  findTemplateLegacyByPhaseAndName,
} from "../modules/templateRegistry/index.js";
```

| Function | Signature | Description |
|----------|-----------|-------------|
| `getAllTemplateIds()` | `() -> string[]` | All registered template IDs |
| `getTemplateVersion(id, version)` | `(string, string) -> TemplateEntry \| null` | Exact version lookup |
| `getLatestTemplateVersion(id)` | `(string) -> TemplateEntry \| null` | Newest version (numeric sort) |
| `verifyTemplateHash(entry)` | `(TemplateEntry) -> {ok, reason, computed}` | SHA hash integrity check |
| `findTemplateLegacyByPhaseAndName(phaseNum, name)` | `(number, string) -> TemplateEntry \| null` | Legacy name-based fallback |

---

## 6. Template Binding Contract (`getTemplateForArtifact`)

`getTemplateForArtifact(phase, artifact)` in `src/utils/templateHelpers.js` resolves a template for a given artifact. Resolution order:

1. **Explicit binding** — use `artifact.template_id` + `artifact.template_version`
2. **Hash verification** — if `artifact.template_hash` is present, verify it matches the registry entry
3. **Legacy fallback** — if no `template_id`, look up by `phase.phase_number` + `artifact.name`

**Return value:**

```js
{ template: TemplateEntry | null, binding: BindingState }
```

| `binding` value | Meaning |
|-----------------|---------|
| `"verified"` | Template found; hash matches — fully trusted |
| `"unverified"` | Template found; no hash to compare (legacy project) |
| `"legacy"` | Template found via name lookup (pre-binding project) |
| `"unresolved"` | `template_id` present but version not in registry |
| `"mismatch"` | Hash present but doesn't match — treat as untrusted |
| `"missing"` | No template found by any method |

When `binding` is `"mismatch"`, `"unresolved"`, or `"missing"`, the artifact falls back to the non-templated completion rule (>= 20-char rationale or notes).

---

## 7. Template Hash Computation

Each template entry includes a `template_hash` to detect registry corruption or tampering. The hash is computed over the canonical JSON serialization of the `fields` array. Use `verifyTemplateHash(entry)` to check integrity — it returns `{ ok: boolean, reason: string, computed: string }`.

Artifacts also store a `template_hash` at authoring time (`artifact.template_hash`). This pins the artifact to the exact field definition used when the artifact was created, regardless of subsequent registry evolution.

---

## 8. Template Inventory (CPMAI plan)

36 templates across 6 phases — 4 core (gate-blocking) + 2 conditional per phase:

| Phase | Core Templates (gate-blocking) | Conditional Templates |
|-------|-------------------------------|----------------------|
| 1 — Business Understanding | Problem Definition Document, Stakeholder Analysis, Success Criteria, Project Charter | Risk Assessment, Regulatory Requirements Analysis |
| 2 — Data Understanding | Data Source Inventory, Data Quality Report, Data Dictionary, Initial Data Exploration Report | Data Lineage Documentation, Privacy Impact Assessment |
| 3 — Data Preparation | Data Cleaning Documentation, Feature Engineering Documentation, Data Transformation Pipeline, Training/Validation/Test Split Documentation | Data Augmentation Strategy, Synthetic Data Generation Plan |
| 4 — Model Building | Model Selection Rationale, Hyperparameter Tuning Documentation, Model Architecture Documentation, Training Procedure Documentation | Ensemble Strategy Documentation, Transfer Learning Documentation |
| 5 — Model Evaluation | Model Performance Metrics, Validation Results, Error Analysis Report, Comparison to Baseline | Fairness and Bias Analysis, Robustness Testing Results |
| 6 — Model Deployment | Deployment Plan, Monitoring Strategy, Rollback Procedure, Documentation for End Users | A/B Testing Plan, Model Governance Documentation |

---

## 9. Adding a New Template

1. Add a new entry to `src/data/template-registry.json` under the appropriate `template_id` key.
2. Populate all required fields: `template_id`, `template_version`, `name`, `phase_number`, `category`, `isGateBlocking`, `description`, `fields[]`.
3. Compute `template_hash` by hashing the canonical JSON of the `fields` array using `verifyTemplateHash`.
4. No code changes required — the registry module and all UI components render dynamically from the JSON.

To include the new template in a project plan, add an artifact entry referencing `template_id` and `template_version` in `buildNewCpmaiProject()` (or via a plan migration).

---

## 10. Template Versioning

Templates are versioned to support evolution without breaking existing projects:

- **Increment `template_version`** when fields change (semver recommended: `"1.0.0"` -> `"1.1.0"`).
- **Append the new entry** to the array — never mutate an existing entry.
- **Existing projects** retain their pinned `template_version`; they are not auto-upgraded.
- `artifact.template_hash` locks the artifact to the exact field definition at authoring time.
