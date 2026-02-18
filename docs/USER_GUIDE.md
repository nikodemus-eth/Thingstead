# Thingstead User Manual

Thingstead is a local-first CPMAI governance workspace for running AI/ML projects through structured phases with explicit gate decisions, artifact tracking, comments, search, and export/import backups.

---

## Table of Contents

1. [Concepts](#1-concepts)
2. [Getting Started](#2-getting-started)
3. [Navigation](#3-navigation)
4. [Keyboard Shortcuts](#4-keyboard-shortcuts)
5. [Projects](#5-projects)
6. [Governance Modes](#6-governance-modes)
7. [Phases](#7-phases)
8. [Artifacts](#8-artifacts)
9. [Waivers](#9-waivers)
10. [Phase Gate Decisions (Go/No-Go)](#10-phase-gate-decisions-gono-go)
11. [Comments](#11-comments)
12. [Search](#12-search)
13. [Dashboard](#13-dashboard)
14. [LAN Sync and Conflict Resolution](#14-lan-sync-and-conflict-resolution)
15. [Export and Import](#15-export-and-import)
16. [Accessibility](#16-accessibility)
17. [Troubleshooting](#17-troubleshooting)
18. [Privacy and Storage](#18-privacy-and-storage)
19. [Licensing](#19-licensing)

---

## 1. Concepts

| Term | Description |
|------|-------------|
| **Project** | The top-level workspace. Each project tracks its own set of phases, artifacts, gate decisions, comments, and audit log. |
| **Phase** | A numbered stage of the plan. CPMAI projects have 6 phases (Business Understanding → Data Understanding → Data Preparation → Model Building → Model Evaluation → Model Deployment). |
| **Artifact** | A work item within a phase. Each artifact may be backed by a structured template (with typed fields) or completed via free-text rationale. |
| **Gate** | A phase-level Go/No-Go decision checkpoint. A gate can only be decided when all gate-blocking artifacts are complete or waived. |
| **Gate-blocking artifact** | An artifact whose incompletion prevents the gate from becoming ready. |
| **Waiver** | An explicit, auditable exception that marks an artifact as intentionally bypassed. A waiver requires a written rationale. |
| **Attestation** | The act of recording a Go/No-Go gate decision with supporting notes. Solo governance requires a minimum-length written attestation. |

Thingstead enforces a deterministic governance model:
- Gate decisions are binary and explicit.
- Artifact status is computed from structured requirements, never manually set.
- Waivers are logged and auditable.
- No automatic advancement occurs without explicit user action.

---

## 2. Getting Started

### Option A: Portable Bundle (Recommended for non-developers)

1. Unzip the portable bundle.
2. Start the app:
   - **macOS:** double-click `Start-Thingstead-Local.command` (or `Start-Thingstead-LAN.command` for LAN sync)
   - **Windows:** double-click `Start-Thingstead-Local.cmd` (or `Start-Thingstead-LAN.cmd`)
   - **Linux:** double-click `Start-Thingstead-Local.sh` (or `Start-Thingstead-LAN.sh`)
3. Your default browser opens automatically to the app URL.

**Data location:** Projects are stored in your browser's local storage. In LAN mode, they are also mirrored to `.openclaw-data/` (next to the app bundle) so other machines on the same network can access them.

### Option B: Developer Run (from source)

```sh
cd thingstead
npm install
npm run dev        # local only
# or
npm run dev:lan    # enable LAN sync API
```

Then open `http://127.0.0.1:4173` in your browser.

---

## 3. Navigation

The app has three top-level views, toggled by the header buttons:

| View | Purpose |
|------|---------|
| **Projects** | Create, select, rename, delete, export, and import projects. |
| **Project** | Phase-by-phase work view — artifacts, gates, waivers, comments. |
| **Dashboard** | Summary widgets: completion ratios, gate overview, blocked artifacts, recent activity. |

Within the **Project** view:
- The **Phase Navigator** (left panel) shows all 6 phases with completion ratios and gate status icons.
- The **Phase Detail** (main panel) shows the artifacts and gate decision for the selected phase.
- **Focus Mode** hides the Phase Navigator to reduce distraction when working deep in a single phase.

---

## 4. Keyboard Shortcuts

Press **`?`** anywhere in the app (when not in a text field) to open the keyboard shortcut reference panel.

| Key | Action |
|-----|--------|
| `?` | Toggle keyboard shortcut help |
| `Ctrl / Cmd + Z` | Undo last action |
| `Ctrl / Cmd + Shift + Z` | Redo |
| `Escape` | Close the topmost open modal or dialog |
| `←` / `→` | Navigate between phases (when Phase Nav is focused) |
| `Tab` / `Shift+Tab` | Move focus between interactive elements (standard browser behavior) |

**In the Phase Navigator:**
- Click any phase button to select it.
- When the navigator is focused, use `←` and `→` arrow keys to move between phases. Focus follows automatically.

**Note:** Keyboard shortcuts are disabled when focus is inside a text input, textarea, or content-editable element.

---

## 5. Projects

### Create a Project

1. Click **New Project**.
2. Enter a project name, then click **Next**.
3. Choose a governance mode:
   - **Team Governance** (default) — for multi-stakeholder projects.
   - **Solo Governance** — for individual practitioners.
4. Click **Create**.

> **Important:** Governance mode cannot be changed after project creation.

### Load a Project

Click the project name or row in the Projects list.

### Delete a Project

Click **Delete** on the project row and confirm in the dialog. Deletion is permanent and removes all phases, artifacts, and comments.

### Rename a Project

The project name is editable from the Projects list.

---

## 6. Governance Modes

Governance mode shapes how gate decisions are recorded and what audit trail is required.

### Team Governance (`"team"`)

- **Intended for:** Multi-stakeholder projects (data scientists, product owners, compliance, leadership).
- **Badge:** "Team Governance"
- **Gate attestation:** No minimum notes requirement. The assumption is that the team's decision record lives in external systems (meeting minutes, Jira tickets, sign-off emails).
- **Template profile:** Standard (full complement of conditional artifacts).

### Solo Governance (`"solo"`)

- **Intended for:** Individual ML practitioners who are the sole decision-maker.
- **Badge:** "Single-Actor Governance"
- **Gate attestation:** Decision notes are **mandatory** and must contain at least **30 non-whitespace characters**. This creates a lightweight durable audit trail — proof that the practitioner intentionally approved each phase gate.
- **Template profile:** Minimum-compliance (fewer required conditional artifacts).

---

## 7. Phases

Thingstead follows the CPMAI lifecycle with 6 phases:

| # | Phase | Purpose |
|---|-------|---------|
| 1 | Business Understanding | Define the problem, stakeholders, success criteria, and project charter |
| 2 | Data Understanding | Inventory data sources, assess quality, explore initial data |
| 3 | Data Preparation | Clean, engineer features, split datasets |
| 4 | Model Building | Select, tune, and train models |
| 5 | Model Evaluation | Measure performance, analyze errors, compare to baseline |
| 6 | Model Deployment | Plan deployment, monitoring, rollback, and end-user documentation |

Each phase has:
- A set of **artifacts** (4 core gate-blocking + 2 conditional)
- A **completion ratio** badge showing how many artifacts are done
- A **gate status** icon (Locked / Ready / Decided)

### Viewing a Phase

1. Click the phase in the Phase Navigator.
2. The Phase Detail panel shows the phase description, all artifacts grouped by status, and the gate decision panel.

### No-Go Warning

If an earlier phase has a No-Go gate decision, a warning banner appears when viewing a later phase. This is advisory — it does not prevent editing the later phase.

---

## 8. Artifacts

### Artifact Status

Artifact status is **computed automatically** from the content you've entered. You never set status manually.

| Status | Meaning |
|--------|---------|
| **Not Started** | No content entered anywhere |
| **In Progress** | Some content present, but completion criteria not yet met |
| **Complete** | All required template fields satisfied (or rationale ≥ 20 chars for non-templated artifacts) |
| **Waived** | Explicitly waived with a sufficient written rationale |

### Opening an Artifact

Click the artifact name in the Phase Detail panel to open the editor.

### Completion Rules

**Template-based artifacts:** Every field marked `required` must be filled in. Requirements vary by field type:

| Field Type | Satisfied When |
|------------|---------------|
| Short text | Non-empty and meets minimum length |
| Long text | Non-empty and meets minimum length |
| Selection | An option is chosen |
| Checklist | At least one item checked |
| Table | At least one row with all columns filled |
| Date | A date is selected |

**Non-templated artifacts:** Complete when `rationale` or `notes` has ≥ 20 characters.

### Guided Mode vs. Direct Mode

The artifact editor offers two modes:

**Guided Mode** (default):
- One field at a time, with "Why this matters" and "What good looks like" context.
- Shows gate readiness impact.
- Next / Back navigation steps through required fields.
- A secondary checklist tracks each step.

**Direct Mode:**
- All fields visible simultaneously.
- Useful when you know what you're doing or want to scan the full artifact quickly.

Toggle between modes using the mode button in the artifact editor header.

### Rationale and Notes

Every artifact has two free-text fields that supplement the structured template:

- **Rationale:** Explain the decision-making context or constraints.
- **Notes:** Markdown-formatted notes with a preview toggle. Use this for links, references, follow-up reminders.

### Template Binding Warnings

If Thingstead cannot verify a template (version or hash mismatch), the artifact falls back to the non-templated completion rule. A warning is shown in the editor. This typically happens when a project was created with a different version of the app.

---

## 9. Waivers

A waiver marks a gate-blocking artifact as intentionally skipped. It does **not** remove the artifact — it records an auditable exception.

### Applying a Waiver

1. Open the artifact.
2. Click **Waive Artifact** (in the WaiverPanel section).
3. Enter a rationale of at least **20 non-whitespace characters**.
4. Click **Apply Waiver**.

The artifact's status changes to **Waived** and the gate recalculates immediately.

### Removing a Waiver

1. Open the waived artifact.
2. Click **Remove Waiver**.

Every waiver application and removal is recorded in the project's audit log with the actor, timestamp, and rationale.

### Waiver Rules

A waiver is only valid when:
- `waived` is `true`
- The rationale has ≥ 20 non-whitespace characters

A waiver with a blank or too-short rationale is treated as no waiver at all.

---

## 10. Phase Gate Decisions (Go/No-Go)

### Gate Lifecycle

```
LOCKED → READY → DECIDED (Go or No-Go)
```

| State | Icon | Condition |
|-------|------|-----------|
| **Locked** | 🔒 | One or more gate-blocking artifacts are incomplete and not waived |
| **Ready** | 🚦 | All gate-blocking artifacts are complete or waived |
| **Go** | ✅ | A "Go" decision has been recorded |
| **No-Go** | ❌ | A "No-Go" decision has been recorded |

### Recording a Decision

1. Complete or waive all gate-blocking artifacts for the phase.
2. The **Go/No-Go Decision** panel unlocks.
3. Optionally enter decision notes.
4. Click **Record Go** or **Record No-Go**.

For **Solo Governance:** decision notes are mandatory and must contain at least 30 non-whitespace characters. If the requirement isn't met, an error message appears.

For **Team Governance:** notes are optional.

### Editing a Decision

Click **Edit Decision** to change a previously recorded Go or No-Go. All edits are timestamped.

---

## 11. Comments

Each artifact has a comment thread for review trail and follow-up notes.

- Add a comment using the text input at the bottom of the artifact editor.
- **Resolve** a comment to mark it as addressed (it stays visible but is visually distinguished).
- Use comments for self-critique, reviewer feedback, and future-review prompts.

Comments are stored as part of the project data and are included in exports.

---

## 12. Search

The **Search** view finds content across all phases and artifacts in the current project.

Search covers:
- Phase names
- Artifact names
- Artifact notes and rationale
- Template field values

Clicking a search result jumps directly to the relevant phase and highlights the artifact.

---

## 13. Dashboard

The **Dashboard** view provides an at-a-glance summary of the current project.

### Available Widgets

| Widget | Shows |
|--------|-------|
| Project Summary | Overall completion percentage |
| Phase Status | Per-phase completion ratios |
| Recent Activity | Latest changes (most recently modified artifacts) |
| Gate Overview | Go/No-Go status across all phases |
| Blocked Artifacts | Gate-blocking artifacts that are not yet complete or waived |

### Widget Controls

- **Drag** a widget by its header to reposition it.
- **Add/Remove Widgets:** toggle which widgets are visible.
- **Reset Layout:** restore the default widget arrangement.

---

## 14. LAN Sync and Conflict Resolution

When running in LAN mode (portable LAN bundle or `npm run dev:lan`), Thingstead mirrors projects to a local server that other machines on the same network can reach.

### How It Works

- Every time you save a project, Thingstead sends it to the LAN server.
- When you load a project, Thingstead compares its local version to the server version using modification timestamps.
- If another machine has saved a newer version to the server since you last synced, a **conflict** is detected.

### LAN Status Indicator

The header shows a LAN status indicator:
- **Connected** — the server is reachable.
- **Unavailable** — the server cannot be reached (local-only mode active; your data is safe locally).

### Conflict Resolution

When a conflict is detected, a dialog appears with three options:

| Option | What happens |
|--------|-------------|
| **Use Mine** | Your local version is pushed to the server, overwriting the server copy. |
| **Use Theirs** | The server version replaces your local copy. No re-upload occurs. |
| **Keep Both** | The server version is saved as a new project (with " (Server Copy)" appended to the name). Your local version is unchanged. |
| **Cancel** | Dismiss the dialog. No changes are made. |

> **Tip:** If "Use Mine" fails because the server is temporarily down, an error notice appears and the dialog stays open so you can retry.

---

## 15. Export and Import

### Export

Click **Export JSON** on a project row to download a `.json` file containing the complete project state (all phases, artifacts, comments, gate decisions, and audit log).

Use exports as your canonical backup. Treat them like a save file.

### Import

1. Click **Import Project**.
2. Select a Thingstead `.json` export file.
3. If the imported project ID already exists in your workspace:
   - **Overwrite:** Replace the existing project with the imported one.
   - **Keep Both:** Import as a new project with a new ID.

> **Note:** Manually edited JSON files may fail import validation if the structure is invalid.

---

## 16. Accessibility

Thingstead targets **WCAG 2.1 Level AA** compliance.

### Screen Reader Support

- All modals have `role="dialog"` and `aria-modal="true"`.
- Status notices (success/error) use `aria-live` regions so screen readers announce them without focus movement.
- Decorative icons are hidden from screen readers (`aria-hidden`); meaningful icons carry `aria-label`.

### Focus Management

- All modals trap focus: `Tab` and `Shift+Tab` cycle within the modal. Focus returns to the triggering element when the modal closes.
- Opening any modal moves focus to the first interactive element inside it.

### Keyboard Navigation

- A **skip-to-content** link is the first focusable element on the page. Press `Tab` from the address bar to reveal it, then `Enter` to jump past the header to the main content area.
- The Phase Navigator supports `←` / `→` arrow keys to move between phases.
- All interactive elements are reachable by keyboard.

### Reduced Motion

If you have enabled "Reduce motion" in your operating system accessibility settings, Thingstead disables its JS-driven animations automatically.

### Color Contrast

All text meets WCAG AA minimum contrast ratios (4.5:1 for normal text, 3:1 for large text).

---

## 17. Troubleshooting

### App doesn't open

- **Developer:** run `npm run dev` in the `thingstead/` directory, then open `http://127.0.0.1:4173`.
- **Portable:** re-run the start script. If it fails with "address already in use", a previous instance is still running — close it first (or restart your machine).

### Gate stays locked

- Check that every gate-blocking artifact (marked with a lock icon) is either **Complete** or **Waived**.
- Verify waiver rationale meets the 20 non-whitespace character minimum.
- Template fields: ensure every required field (marked with an asterisk or "required" label) has valid content.

### Solo attestation error

The error _"Solo mode requires attestation notes (minimum 30 non-whitespace characters)"_ appears when the Go/No-Go notes field has fewer than 30 non-whitespace characters. Spaces, tabs, and newlines don't count — write substantive notes.

### Changes not persisting

- If you're using a **private/incognito browser window**, localStorage may not persist between sessions.
- Export JSON immediately if you suspect data loss.
- In LAN mode, check the LAN status indicator — if the server is unavailable, saves are local-only until it reconnects.

### Import rejected

- Confirm the JSON came from Thingstead's own Export function.
- Manually edited files may fail structural validation. Use the original export.

### LAN sync not working

- Both machines must be on the same local network.
- Start Thingstead in LAN mode (`Start-Thingstead-LAN.*` or `npm run dev:lan`).
- Check your firewall: the LAN API uses port 4174 (or as shown in the startup output).

---

## 18. Privacy and Storage

- **Local-first:** All project data is stored in your browser's `localStorage`. Nothing is sent to any external server.
- **LAN mode only:** In LAN/portable mode, projects are also mirrored to a local `.openclaw-data/` directory on the machine running the server. Only machines on your local network can reach this.
- **No telemetry:** Thingstead does not collect analytics, crash reports, or usage data.
- **Backups:** Use **Export JSON** regularly. Browser storage can be cleared by the browser or the OS. Exported files are your durable record.

---

## 19. Licensing

Thingstead is dual-licensed:

- **Open Source:** GNU Affero General Public License v3.0 (AGPL-3.0)
- **Commercial:** A separate commercial license is available from Thingstead LLC for use cases incompatible with the AGPL.

For commercial licensing inquiries, contact Thingstead LLC.
