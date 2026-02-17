# Thingstead User Manual

Thingstead is a local-first CPMAI governance workspace for running projects through phases with explicit gate decisions, artifact tracking, comments, search, and export/import backups.

## Governance Model

Thingstead enforces a deterministic governance model:

- Gate decisions are binary and explicit.
- Artifact status is computed from structured requirements.
- Waivers are logged and auditable.
- No automatic advancement occurs without explicit user action.

## Concepts

- Project: the top-level workspace.
- Phase: a numbered stage of the plan (CPMAI is typically 6 phases).
- Artifact: a work item within a phase (with template-driven fields, notes, rationale, waiver, comments).
- Gate (phase-level): a Go/No-Go decision that becomes available only when the phase is gate-ready.
- Waiver: an explicit, logged exception for an artifact (distinct from status).

## Getting Started

### Option A: Portable (Recommended for non-developers)

1. Unzip the portable bundle.
2. Start it:
   - macOS: double-click `Start-Thingstead-Local.command` (or `Start-Thingstead-LAN.command`)
   - Windows: double-click `Start-Thingstead-Local.cmd` (or `Start-Thingstead-LAN.cmd`)
   - Linux: double-click `Start-Thingstead-Local.sh` (or `Start-Thingstead-LAN.sh`)
3. Your browser opens to the app URL.

Data location (portable bundles):
- Stored next to the app in `.openclaw-data/` (LAN API store), and also in your browser’s local storage (for local-first behavior).

### Option B: Developer Run (from source)

```sh
cd Thingstead
npm install
npm run dev
```

Then open `http://127.0.0.1:4173`.

LAN-friendly dev:

```sh
cd Thingstead
npm run dev:lan
```

## Navigation

- Dashboard: summary widgets and gate/completion overview.
- Project: phase-by-phase execution.
- Focus Mode: hides phase navigation to reduce distractions while working in a single phase.

Keyboard:
- Undo: `Ctrl/Cmd+Z`
- Redo: `Ctrl/Cmd+Shift+Z`

## Projects

### Create a Project

1. Click `New Project`.
2. Enter a project name, click `Next`.
3. Choose governance:
   - Team Governance
   - Solo Governance

### Switch Projects

- Click a project in the Projects list to load it.

### Delete a Project

- Click `Delete` on the project row and confirm.

### Export / Import (Backups and Transfers)

Export:
- Click `Export JSON` for a project to download a single JSON file.

Import:
1. Click `Import Project` and pick a JSON export.
2. If there is an ID collision, choose:
   - Overwrite
   - Keep Both (creates a new project ID)

Important:
- Export/import is the safest way to transfer across browsers or machines.

## Dashboard (Widgets)

The dashboard provides moveable widgets (drag by the widget header), including:
- Project Summary (overall completion)
- Phase Status (phase completion ratios)
- Recent Activity
- Gate Overview
- Blocked Artifacts

Controls:
- `Add/Remove Widgets`: show/hide widgets
- `Reset Layout`: revert to the default layout

## Phases

In Project view:
1. Select a phase card.
2. Review completion ratios and indicators (gate-blocking, waivers).
3. Open and complete artifacts.

## Artifacts

### Status Is Computed (Not Editable)

Artifact status is computed from completion and waiver state.
- You do not choose status from a dropdown.
- Completion depends on template field requirements and content.
- Waivers are explicit and logged.

Displayed states include:
- Not Started
- In Progress
- Complete
- Waived

### Gate-Blocking Artifacts

Gate-blocking artifacts affect whether the phase gate can become ready.

### Guided Mode vs Direct Mode

When an artifact is open:
- Guided Mode (default): one step at a time (field-by-field) with:
  - Why this matters
  - What good looks like
  - Gate readiness impact
  - Next/Back navigation
  - Checklist (secondary)
- Direct Mode: shows the full template fields at once (plus rationale and notes).

### Waivers

Waiving an artifact requires a rationale:
- Minimum: 20+ non-whitespace characters
- Waivers are stored with `waived_by` and `waived_at`

### Notes (Markdown)

Artifact notes use markdown editing with preview support.

### Template Binding Warnings

If Thingstead cannot verify a template binding (version/hash mismatch), the artifact cannot be completed until:
- the template version can be resolved, or
- the artifact is explicitly waived.

## Comments

Each artifact supports comments for review trail and follow-ups.
- Comments can be marked resolved.
- Use comments for advisory notes, self-critique, and future review prompts.

## Phase Gate Decisions (Go/No-Go)

A phase gate becomes available only when the phase is gate-ready (all gate-blocking artifacts are complete or waived).

When ready:
- Record `Go` or `No-Go`.
- Decisions record timestamp and attestation type.

Solo Governance:
- Requires attestation notes with at least 30 non-whitespace characters.

You can reopen a decided gate via `Edit Decision`.

## Search

Search covers:
- Phase names
- Artifact names
- Artifact notes and rationale

Selecting a result jumps to the relevant phase/artifact.

## Troubleshooting

- App doesn’t open:
  - Dev: run `npm run dev` in `Thingstead/`, then open `http://127.0.0.1:4173`.
  - Portable: re-run the start script and check for “address already in use” on port 4173.

- Gate stays locked:
  - Check gate-blocking artifacts for required field completion or waivers.
  - Verify waiver rationale length requirements.

- Changes not persisting:
  - Export JSON immediately.
  - If using private browsing / storage-restricted environments, localStorage may not persist reliably.

- Import rejected:
  - Confirm the JSON came from Thingstead export.
  - If the file was edited manually, structural validation may fail.

## Privacy and Storage

- Thingstead is local-first: it stores project state in the browser.
- In LAN/portable mode, it also mirrors projects to a local on-disk store via the built-in API so other machines on the LAN can access them.
- Treat `Export JSON` as your canonical backup.

## Licensing

Thingstead is dual-licensed under the GNU Affero General Public License v3.0 (AGPL-3.0) and a separate commercial license offered by Thingstead LLC.

For commercial licensing inquiries, contact Thingstead LLC.
