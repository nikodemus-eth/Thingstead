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

