# Phase 1 — v1.x Stabilization & Hardening Design

Version: 1.0
Status: Approved
Date: 2026-02-17
Scope: Convert v0.9.x into a production-grade deterministic governance engine.

No feature expansion. This is fortification.

---

## Ordering Strategy

Data-first. Protect user data before improving UX or writing docs.

Execution order:
1. Data Integrity Hardening
2. Backend Discipline
3. UX Stability (Full WCAG AA)
4. Documentation

---

## 1. Data Integrity Hardening

### 1.1 Chained Schema Migrators

Current `normalizeProject.js` becomes the v0→v1 migrator retroactively.

New structure:
```
src/migrations/
  index.js          — orchestrator: detects version, chains migrators
  v0_to_v1.js       — wraps existing normalizeProject logic
  v1_to_v2.js       — (future, placeholder)
```

Orchestrator contract:
- Read `meta.schema_version` (or legacy `schemaVersion`; default "0" if absent).
- Chain: `v0→v1→...→current` in order.
- Each migrator is a pure function: `(project) → project`. Deterministic. Testable.
- After migration, stamp `meta.schema_version` to current version.
- Strict mode: if project already at current version but canonical form differs, return error (not silent fix).

### 1.2 Export Backward Compatibility

- Export always writes current schema version.
- Import runs the migration chain (any version ≤ current accepted).
- Round-trip test: `export(import(legacyProject))` must produce valid current-version project.
- Export bundle includes `minReaderVersion` field so older clients know if they can read it.

### 1.3 Corruption Detection

- Verify integrity hash on every project load (not just import).
- Hash mismatch: surface in UI with "Project may have been modified outside Thingstead" warning.
- `projectIntegrity.verify(project)` checks:
  1. Hash matches canonical form.
  2. All phase IDs unique.
  3. All artifact IDs unique across project.
  4. Gate decisions reference valid phases.
  5. Waiver rationale meets minimum length.

### 1.4 Snapshot Integrity

- Before creating undo snapshot, verify current state is valid.
- If snapshot would capture corrupt state, skip it and warn user.

---

## 2. Backend Discipline

### 2.1 Timestamp-Based Conflict Detection (LAN Sync)

Current state: `upsertRemoteProject()` does blind HTTP PUT. No version check.

New flow:
1. Server stores `lastModified` per project (already in project data; server trusts it).
2. On PUT: compare incoming `lastModified` against stored `lastModified`.
   - Incoming newer or equal → accept, return 200.
   - Incoming older → reject with 409 Conflict, return server's current version in response body.
3. Client handles 409: shows conflict resolution UI with three choices:
   - **Use mine** — force overwrite with local version.
   - **Use theirs** — discard local changes, load server version.
   - **Keep both** — create copy with new UUID, keep both versions.

Clock drift mitigation:
- 2-second tolerance window (timestamps differing by ≤2s treated as "same time", accept write).
- No NTP requirement. LAN tool on personal machines.

### 2.2 Index Rebuild Logic

- New endpoint: `GET /api/index/rebuild` — server scans all project files, regenerates index from disk.
- Called on server startup and available as manual recovery action.
- Client-side: if index lists a project that doesn't exist locally or remotely, remove from index (self-healing).

### 2.3 Graceful Degradation on Server Failure

- Current silent fallback to local is correct. Keep it.
- Add UI status indicator: subtle icon showing LAN sync status (connected / disconnected / conflict).
- On disconnect: queue writes in memory, attempt replay when connection returns (max 3 retries, 5s backoff).
- If replay fails: warn user "X changes are local-only".

### 2.4 File Write Atomicity (Server)

- Atomic rename already exists (`atomicWriteJson`). Keep it.
- Add fsync before rename to ensure data flushed to disk.
- Add read-after-write verification: validate JSON parse-ability of written file after rename.

---

## 3. UX Stability (Full WCAG AA)

### 3.1 Perceivable

**Color contrast audit:**
- All text meets 4.5:1 ratio (3:1 for large text).
- Audit `theme.css` variables against both light/dark themes.
- Fix any violations.

**Status communication:**
- Status indicators must not rely on color alone.
- Existing glyph icons satisfy this.
- Add `aria-label` to every `<GlyphIcon>` usage that conveys meaning.

**Reduced motion:**
- Add `@media (prefers-reduced-motion: reduce)`.
- Disable framer-motion animations; replace with instant transitions.
- `Motion.ul`/`Motion.li` wrappers need conditional bypass.

### 3.2 Operable

**Focus trapping in modals:**
- All 4 extracted modals (Create, Delete, Collision, Share) plus WaiverPanel need focus trap.
- Implement reusable `useFocusTrap` hook:
  - Trap Tab/Shift+Tab within modal.
  - Return focus to trigger element on close.
  - Auto-focus first interactive element on open.

**Skip-to-content link:**
- Hidden-until-focused skip link at top of App.jsx targeting `#main-content`.

**Visible focus indicators:**
- Add `:focus-visible` styles to all interactive elements in `index.css`.
- Replace browser default with consistent 2px outline matching theme.

**Keyboard shortcut help:**
- `?` shortcut opens help dialog listing all shortcuts (Undo, Redo, Escape, `?`).

**Phase navigation by keyboard:**
- PhaseNav tabs support Arrow Left/Right (roving tabindex pattern).

### 3.3 Understandable

**Error identification:**
- Validation errors associated with fields via `aria-describedby`.

**Consistent navigation:**
- Tab order follows visual order. No `tabIndex` hacks.

**Input purpose:**
- Add `autocomplete` attributes where applicable.

### 3.4 Robust

**Semantic HTML audit:**
- Replace any `<div>` with click handlers with `<button>`.
- All lists use `<ul>`/`<li>`.
- Headings follow hierarchy (no skipped levels).

**ARIA landmarks:**
- `role="main"`, `role="navigation"`, `role="complementary"` on major layout sections.

**Live regions:**
- `aria-live="polite"` on notice/toast area for screen reader announcements.

### 3.5 Visual Race Conditions

- Verify notice timeout cancellation handles React strict mode double-fire.
- Add `layout` prop with `layoutId` to framer-motion lists to prevent layout shift on rapid add/remove.

### 3.6 Deterministic Rendering Order

- Sort project list by `lastModified` descending (most recent first).
- Artifact list order matches phase template definition order (already correct via array position).

---

## 4. Documentation

### 4.1 Formal Schema Documentation

Expand `docs/SCHEMA_CONTRACT.md`:
- Full field-by-field schema reference for v1.
- Type annotations (string, number, ISO8601, enum values).
- Required vs optional fields.
- Migration chain documentation.
- Examples of valid v1 projects (minimal and complete).

### 4.2 Template Registry Spec

New doc: `docs/TEMPLATE_REGISTRY_SPEC.md`:
- Field type definitions (short_text, long_text, selection, checklist, table, date).
- Validation rules per type (minLength, required, gateBlocking).
- Template binding contract (artifact.template_id + template_version resolution).
- Template hash computation method.
- How to add new templates.

### 4.3 Gate Readiness Rules

New doc: `docs/GATE_RULES.md`:
- Gate readiness computation algorithm (from gateLogic.js).
- Gate-blocking vs non-gate-blocking artifacts.
- Waiver semantics (interaction with gate readiness).
- Decision lifecycle: locked → ready → go/no-go → decided.
- Solo mode vs standard mode differences.

### 4.4 Governance Mode Clarity

New doc: `docs/GOVERNANCE_MODES.md`:
- Standard mode: full governance, all artifacts, all gates.
- Solo mode: simplified governance, reduced artifact requirements.
- How governance mode is set (project creation) and mutability.
- Impact on template binding and gate rules.

All docs follow existing style: terse, technical, assertion-based.

---

## Design Decisions Log

| Decision | Choice | Rationale |
|---|---|---|
| Ordering | Data-first | User data protection before UX polish |
| Schema migration | Chained migrators | Explicit, auditable, testable per-version functions |
| LAN conflict | Timestamp-based | Simpler than ETags; acceptable for single-user LAN |
| A11y depth | Full WCAG AA | Governance tool requires accessible interface |
| Clock drift | 2s tolerance | Practical for LAN without NTP requirement |
| Conflict UI | 3-way choice | Use mine / Use theirs / Keep both covers all cases |

---

## Out of Scope

- Feature expansion (Phase 2+).
- Probabilistic modules (Phase 4+).
- Multi-user authentication.
- Cloud sync.
- IndexedDB migration (localStorage sufficient for v1).
