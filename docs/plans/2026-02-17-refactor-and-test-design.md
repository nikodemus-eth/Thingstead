# Thingstead Refactor & Test Design

## Problem

1. macOS `._` resource fork files cause 8 test suite failures and 64 lint errors.
2. Critical business logic (gate logic, artifact state, storage, import/export) has zero unit tests.
3. Two components exceed 500 LOC with mixed concerns (ArtifactEditor: 538, ProjectList: 633).
4. Status computation logic is duplicated across 4+ components.
5. ProjectContext.jsx (387 LOC) combines reducer, helpers, side effects, and LAN sync.

## Approach: Stabilize-Then-Refactor

Test critical logic first to create a safety net, then refactor with confidence.

## Phase 1: Cleanup

- Delete all `._` resource fork files from `src/`, `e2e/`, `tools/`.
- Add `._*` to `.gitignore`.
- Verify: `npm test` passes (25/25), `npm run lint` passes (0 errors), `npm run build` succeeds.

## Phase 2: Unit Tests for Critical Untested Logic

### 2a. Extract reducer from ProjectContext

Move reducer + helper functions from `src/contexts/ProjectContext.jsx` into `src/state/projectReducer.js`. Context file becomes a thin React wrapper.

Extracted functions:
- `reducer(state, action)`
- `cloneProject(project)`
- `updateArtifactInProject()`
- `updateArtifactWaiverInProject()`
- `updateGateDecisionInProject()`
- `createSnapshot()`
- `clampHistory()`
- `initialState`

### 2b. New test files

| File | Tests | Priority |
|------|-------|----------|
| `src/state/projectReducer.test.js` | All action types, undo/redo, history clamping, snapshot creation | CRITICAL |
| `src/utils/gateLogic.test.js` | Gate readiness: all-complete, one-incomplete, waived, no-blockers | CRITICAL |
| `src/utils/artifactState.test.js` | Status computation per field type, waiver overrides | CRITICAL |
| `src/utils/templateHelpers.test.js` | Template lookup, field satisfaction per type | HIGH |
| `src/utils/importExport.test.js` | Valid import, corrupted JSON, schema mismatch, ID collision | CRITICAL |
| `src/utils/storage.test.js` | Save/load round-trip, atomic write recovery, quota exceeded | CRITICAL |

## Phase 3: Component Refactoring

### 3a. ArtifactEditor (538 LOC -> ~4 files)

- `src/components/WaiverPanel.jsx` — waiver form with rationale validation
- `src/components/TemplateFieldRenderer.jsx` — factory component for field types
- `src/utils/fieldGuidance.js` — extracted `guidanceForTemplateField()`
- `src/components/ArtifactEditor.jsx` — orchestrator (~150 LOC)

### 3b. ProjectList (633 LOC -> ~3 files)

- `src/components/modals/ShareModal.jsx`
- `src/components/modals/CreateModal.jsx`
- `src/components/modals/DeleteModal.jsx`
- `src/components/modals/CollisionModal.jsx`
- `src/components/ProjectList.jsx` — list view + action bar (~200 LOC)

### 3c. Shared utilities

- `src/utils/statusHelpers.js` — centralized status-to-glyph/label mapping

## Phase 4: Expanded Tests & E2E

### 4a. Component tests for new pieces

- `WaiverPanel.test.jsx` — renders form, validates rationale length
- `TemplateFieldRenderer.test.jsx` — renders each field type
- `statusHelpers.test.js` — mapping correctness

### 4b. E2E

- Run existing Playwright suite (chromium, firefox, webkit, webkit-mobile)
- Fix any failures
- No new specs unless gaps found

## Constraints

- No Redux, MobX, Tailwind, or backend (per architecture.md)
- No inline styles
- Artifact names remain immutable
- All timestamps remain UTC ISO8601
- Template JSON remains sole source of artifact definitions

## Success Criteria

- `npm test` — all tests pass (existing + new)
- `npm run lint` — 0 errors
- `npm run build` — succeeds, no regressions
- `npm run test:e2e` — all specs pass across browser targets
- ArtifactEditor.jsx under 200 LOC
- ProjectList.jsx under 250 LOC
- No component exceeds 300 LOC
