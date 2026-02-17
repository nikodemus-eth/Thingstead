# CPMAI Solo Mode Addendum v0.9.1

## Scope
This addendum introduces a Single-Actor Governance Mode while preserving deterministic gate logic, auditability, and export portability.

## Implemented Data Additions
- `Project.governance_mode`: `"team" | "solo"`
- `Project.project_owner`: owner identifier for assignment defaults
- `Project.template_set_profile`: lightweight profile label for reporting
- `GateDecision.attestation_type`: `"team_decision" | "solo_attestation"`
- `Artifact.assigned_to`: ownership field (auto-assigned in Solo mode)
- `Artifact.comments[]`: structured comments with:
  `comment_type`, `content`, `status`, `created_at`, `created_by`, `resolved_at`, `resolved_by`

## Behavior
- New projects can be created in Solo or Team mode.
- Solo mode auto-assigns all artifacts to the project owner.
- Solo mode gate decisions require attestation notes (minimum 30 non-whitespace characters).
- Gate decisions in Solo mode are tagged as `solo_attestation`; Team mode uses `team_decision`.
- Artifact editor now supports comment creation with `advisory`, `self-critique`, and `future-review` types.
- Comments can be resolved/reopened while preserving audit metadata.
- Per-phase governance depth indicator is visible in phase navigation and dashboard:
  Minimum CPMAI Compliance, Standard, Extended Governance.

## Compatibility
- Backward compatible with existing stored/imported projects.
- Missing Solo fields are normalized at import/load time with safe defaults.

## Non-Goals in This Iteration
- Full team role/membership UI and role-based permissions.
- Template registry metadata (`solo_recommended`) and template selection UX.
