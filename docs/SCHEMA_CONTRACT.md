# Schema Immutability And Migration Contract

This document defines the project serialization contract for Thingstead.

## Principles

- **Schema is immutable per version.** Once a `schema_version` is released, its meaning does not change.
- **Computed state is not authoritative.** Artifact status is computed at runtime and must not be treated as user-authored data.
- **Plan constraints are modular.** CPMAI is a plan profile. The engine must not assume CPMAI-specific counts/names in core validation.

## Version Fields

Thingstead projects may contain both legacy and current fields:

- `schema_version` (string, recommended) and legacy `schemaVersion` (number)
- `plan.id` (string) and legacy `plan_id` (string)
- `plan.version` (string) and legacy `plan_version` (string)

Normalizing code preserves compatibility, but **imports can be configured to be strict** to prevent silent migrations.

## Computation Contract

- `meta.rule_engine_version` is persisted for auditability.
- When a computed semantic changes (gate readiness logic, required-field completion semantics, waiver semantics), bump `RULE_ENGINE_VERSION`.

## Migration Contract

When introducing a new `schema_version`:

1. Add a deterministic migration from older versions to the new version.
2. Keep the ability to read at least the previous major schema version.
3. Never change the meaning of existing fields for an already-published schema version.

## Strict Import

Strict import mode is allowed to fail-fast if:

- The payload is not canonical (normalization would change it).
- The payload is missing required structural fields (plan id, phase numbers, template bindings, etc.).

The intent is to keep imports deterministic and auditable.

---

## V1 Field Reference

**Current schema version:** `"1"`
**Export bundle version:** `1`

### Top-Level Project Object

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | `string` (UUID) | Yes | — | Immutable after creation |
| `name` | `string` | Yes | — | Non-empty display name |
| `description` | `string` | No | `""` | Optional project narrative |
| `created` | ISO8601 | Yes | — | Creation timestamp; immutable |
| `lastModified` | ISO8601 | Yes | — | Updated on every save |
| `lastSavedFrom` | `string` | Yes | — | Device ID of last writer |
| `schema_version` | `"1"` | Yes | — | Canonical string form |
| `schemaVersion` | `1` | No | — | Numeric alias for legacy compat |
| `plan` | `object` | Yes | — | `{ id: string, version?: string }` |
| `plan_id` | `string` | Yes | `"cpmai"` | Alias for `plan.id` |
| `plan_version` | `string` | No | — | Alias for `plan.version` |
| `governance_mode` | `"solo" \| "team"` | Yes | `"team"` | Set at creation; see `GOVERNANCE_MODES.md` |
| `project_owner` | `string` | Yes | — | Format: `"owner:{deviceId}"` |
| `template_set_profile` | `string` | Yes | `"standard"` | `"minimum-compliance"` (solo) or `"standard"` (team) |
| `meta` | `object` | Yes | — | See Meta sub-object below |
| `audit_log` | `AuditEvent[]` | Yes | `[]` | See Audit Event below |
| `openclaw` | `object` | Yes | — | See OpenClaw sub-object below |
| `phases` | `Phase[]` | Yes | — | At least one phase required for CPMAI |

#### Meta Sub-object

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `schema_version` | `"1"` | Yes | Authoritative version field |
| `rule_engine_version` | `string` | Yes | Version of gate/completion logic at normalization time |
| `normalized_at` | ISO8601 | Yes | Timestamp of last normalization |
| `migrated_from` | `string` | No | Present only if project was migrated (e.g. `"0"`) |

#### OpenClaw Sub-object

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `linkedAgentIds` | `string[]` | Yes | `[]` if no agents linked |
| `lastAgentHeartbeat` | ISO8601 \| `null` | Yes | `null` if no heartbeat received |
| `advisoryDrafts` | `object` | Yes | `{}` if empty; keyed by artifact ID |

---

### Phase Object

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | `string \| number` | Yes | — | Typically 1–6 for CPMAI; unique within project |
| `name` | `string` | Yes | — | Non-empty |
| `phase_number` | `integer` | Yes (warn if missing) | — | >= 1; unique within project |
| `goNoGoDecision` | `object` | Yes | — | See GoNoGo sub-object below |
| `artifacts` | `Artifact[]` | Yes | `[]` | |

#### GoNoGo Sub-object

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `status` | `"pending" \| "go" \| "no-go"` | Yes | `"pending"` until decision is recorded |
| `decidedAt` | ISO8601 \| `null` | Yes | `null` when status is `"pending"` |
| `notes` | `string` | Yes | `""` by default; solo mode requires >= 30 non-whitespace chars |
| `attestation_type` | `"solo_attestation" \| "team_decision"` | Yes | Set from project `governance_mode` |

---

### Artifact Object

| Field | Type | Required | Default | Notes |
|-------|------|----------|---------|-------|
| `id` | `string` (UUID) | Yes | — | Globally unique within the project |
| `name` | `string` | Yes | — | |
| `category` | `"core" \| "conditional" \| "supplemental"` | Yes | — | |
| `isGateBlocking` | `boolean` | Yes | — | If `true`, artifact completion or waiver is required for gate readiness |
| `assigned_to` | `string` | Yes | `project_owner` | Format: `"owner:{deviceId}"` |
| `phase_id` | `string` | Yes | — | Must match containing phase `id` |
| `lastModified` | ISO8601 | Yes | — | |
| `template_id` | `string \| null` | Yes (warn if missing) | `null` | |
| `template_version` | `string \| null` | Yes (warn if missing) | `null` | |
| `template_hash` | `string \| null` | No | `null` | SHA hash for integrity verification |
| `field_values` | `object` | Yes (warn if missing) | `{}` | `{ [fieldId]: value }` |
| `rationale` | `string` | Yes | `""` | >= 20 chars triggers completion for non-templated artifacts |
| `notes` | `string` | Yes | `""` | Supplemental free-text |
| `waiver` | `Waiver \| null` | Yes | `null` | See Waiver sub-object below |
| `comments` | `Comment[]` | Yes | `[]` | See Comment object below |

#### Waiver Sub-object

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `waived` | `boolean` | Yes | `true` to activate the waiver |
| `rationale` | `string` | Yes | >= 20 non-whitespace chars required for waiver to be valid |
| `waived_at` | ISO8601 \| `null` | Yes | |
| `waived_by` | `string \| null` | Yes | Device/actor ID |

**Waiver validity:** `waived === true` AND `rationale` has >= 20 non-whitespace characters.

---

### Comment Object

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `id` | `string` (UUID) | Yes | Generated if missing on normalization |
| `comment_type` | `"advisory" \| "self-critique" \| "future-review"` | Yes | |
| `content` | `string` | Yes | |
| `status` | `"open" \| "resolved"` | Yes | |
| `created_at` | ISO8601 | Yes | |
| `created_by` | `string` | Yes | Device/actor ID |
| `resolved_at` | ISO8601 | Conditional | Required when `status === "resolved"` |
| `resolved_by` | `string` | Conditional | Required when `status === "resolved"` |

---

### Audit Event Object

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `type` | `"WAIVER_APPLIED" \| "WAIVER_REMOVED"` | Yes | |
| `actor_id` | `string` | Yes | Device/actor ID |
| `phase_id` | `string` | Yes | |
| `artifact_id` | `string` | Yes | |
| `rationale` | `string` | Yes | |
| `timestamp` | ISO8601 | Yes | |

---

### Export Bundle Format

The export bundle wraps a normalized project for portable sharing between devices.

```jsonc
{
  "schemaVersion":    1,        // Always 1
  "minReaderVersion": "1",      // Minimum Thingstead version that can read this bundle
  "createdAt":        ISO8601,
  "appVersion":       string,   // Optional; Thingstead version that created this

  "project": {
    // Full project object (all fields above) plus:
    "integrity": { /* hash and optional signature */ }
  }
}
```

**Filename format:** `thingstead-project_{slugified-name}_{YYYY-MM-DD}.json`

---

### Migration Chain

| From | To | Migrator |
|------|----|----------|
| `"0"` (legacy, no version field) | `"1"` | `normalizeProject()` in `src/utils/normalizeProject.js` |

**Version detection order:** `meta.schema_version` → `schema_version` → `schemaVersion` → defaults to `"0"`.

---

### Minimal Valid Project (v1)

```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "name": "My Project",
  "created": "2026-01-01T00:00:00.000Z",
  "lastModified": "2026-01-01T00:00:00.000Z",
  "lastSavedFrom": "device-abc",
  "schema_version": "1",
  "plan": { "id": "cpmai" },
  "plan_id": "cpmai",
  "governance_mode": "team",
  "project_owner": "owner:device-abc",
  "template_set_profile": "standard",
  "meta": {
    "schema_version": "1",
    "rule_engine_version": "1.0.0",
    "normalized_at": "2026-01-01T00:00:00.000Z"
  },
  "audit_log": [],
  "openclaw": {
    "linkedAgentIds": [],
    "lastAgentHeartbeat": null,
    "advisoryDrafts": {}
  },
  "phases": [
    {
      "id": 1,
      "name": "Business Understanding",
      "phase_number": 1,
      "goNoGoDecision": {
        "status": "pending",
        "decidedAt": null,
        "notes": "",
        "attestation_type": "team_decision"
      },
      "artifacts": []
    }
  ]
}
```
