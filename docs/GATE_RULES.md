# Gate Rules

This document describes how phase gates work in Thingstead — what it means for a gate to be "locked", "ready", or "decided", and the exact rules governing artifact completion and waivers.

---

## 1. Gate Lifecycle

Each phase has a gate that must be passed before the project can proceed. A gate moves through three states:

```
LOCKED -> READY -> DECIDED (go | no-go)
```

| State | Icon | Condition |
|-------|------|-----------|
| **Locked** | lock | One or more gate-blocking artifacts are incomplete and not waived |
| **Ready** | gate | All gate-blocking artifacts are complete or waived |
| **Decided — Go** | check | A "go" decision has been recorded |
| **Decided — No-Go** | x | A "no-go" decision has been recorded |

---

## 2. Gate Readiness (`isGateReady`)

A phase gate is **ready** when every artifact where `isGateBlocking === true` satisfies at least one of:

1. `isArtifactComplete(artifact, phaseId) === true`, OR
2. `isArtifactWaived(artifact) === true`

Non-blocking artifacts (`isGateBlocking === false`) never prevent gate readiness.

**Source:** `src/utils/gateLogic.js` → `isGateReady(phase)`

---

## 3. Artifact Completion Rules

### 3a. Waivers take priority

If an artifact is waived (see §4), it is always treated as complete for gate purposes — regardless of field values.

### 3b. Template-driven completion

If an artifact has a valid template binding (`"verified"`, `"unverified"`, or `"legacy"`):

- Every field where `required === true` must be **satisfied**.
- If the template has no required fields, the artifact is immediately complete.
- If the template binding is `"mismatch"`, `"unresolved"`, or `"missing"`, fall through to §3c.

**Field satisfaction rules by type:**

| Field type | Satisfied when |
|------------|---------------|
| `short_text` | Non-empty AND length >= `validation.minLength` |
| `long_text` | Non-empty AND length >= `validation.minLength` |
| `selection` | Non-empty (one of the declared options) |
| `checklist` | Non-empty array (at least one item checked) |
| `table` | At least one row where ALL columns are non-empty |
| `date` | Non-empty string |

### 3c. Non-templated fallback

If there is no valid template, the artifact is complete when either:

- `artifact.rationale` has >= 20 characters, OR
- `artifact.notes` has >= 20 characters

**Source:** `src/utils/artifactState.js` → `isArtifactComplete(artifact, phaseId)`

---

## 4. Waivers

A waiver records an explicit decision that a gate-blocking artifact need not be completed. It does not remove the artifact — it flags it as intentionally bypassed.

### Waiver validity

`isArtifactWaived(artifact)` returns `true` when ALL of:
- `artifact.waiver` is a non-null object
- `artifact.waiver.waived === true`
- `artifact.waiver.rationale` has >= 20 **non-whitespace** characters

A waiver with `waived: false` or an empty/short rationale is **not** a valid waiver.

### Waiver object shape

```jsonc
{
  "waived":     true,
  "rationale":  "string >= 20 non-whitespace characters",
  "waived_at":  "ISO8601 | null",
  "waived_by":  "actor-id | null"
}
```

### Waiver audit trail

Every waiver application or removal is recorded in `project.audit_log`:

```jsonc
{
  "type":        "WAIVER_APPLIED" | "WAIVER_REMOVED",
  "actor_id":    "device-id",
  "phase_id":    "1",
  "artifact_id": "uuid",
  "rationale":   "the waiver rationale text",
  "timestamp":   "ISO8601"
}
```

**Reducer action:** `SET_ARTIFACT_WAIVER` in `src/state/projectReducer.js`

---

## 5. Go/No-Go Decisions

Once a gate is **ready**, a decision can be recorded on the phase.

### Decision object

```jsonc
{
  "status":           "pending" | "go" | "no-go",
  "decidedAt":        "ISO8601 | null",
  "notes":            "string",
  "attestation_type": "solo_attestation" | "team_decision"
}
```

### Status transitions

| From | To | When allowed |
|------|----|-------------|
| `pending` | `go` or `no-go` | Gate must be ready |
| `go` or `no-go` | Any other status | Via explicit edit (always allowed) |

### Attestation requirements

| Governance mode | Requirement for decision notes |
|-----------------|-------------------------------|
| `"solo"` | >= 30 **non-whitespace** characters |
| `"team"` | No minimum |

Solo mode validation: `notes.trim().replace(/\s+/g, "").length >= 30`

Error if violated: _"Solo mode requires attestation notes (minimum 30 non-whitespace characters)."_

**Reducer action:** `SET_GATE_DECISION` in `src/state/projectReducer.js`

---

## 6. No-Go Warning

If any earlier phase has a `no-go` decision and the user is editing a later phase, a warning banner is shown in `PhaseNav`:

> _"Warning: You are editing a later phase after a No-Go decision in an earlier phase."_

This is a **soft warning only** — it does not prevent editing. Thingstead records the earliest phase with a `no-go` and compares it to the active phase ID.

---

## 7. Artifact Status (computed at runtime)

| Status | Condition |
|--------|-----------|
| `"waived"` | Valid waiver recorded (`waived: true` + rationale >= 20 non-whitespace chars) |
| `"complete"` | All required template fields satisfied (or >= 20-char rationale for non-templated) |
| `"in-progress"` | Some content present but completion criteria not yet met |
| `"not-started"` | No field values, rationale, notes, or comments |

Statuses are **computed at runtime** from stored artifact data and are **never persisted to storage**.

**Source:** `src/utils/artifactState.js` → `computeArtifactStatus(artifact, phaseId)`
