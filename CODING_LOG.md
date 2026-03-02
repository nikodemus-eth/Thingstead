# Coding Log — Thingstead+

## 2026-03-01: Step 0 — Repository Setup

### What was done
- Cloned Thingstead from `https://github.com/nikodemus-eth/Thingstead.git` into `/Users/nikodemus/Documents/Thingstead+/`
- Created development log (this file) and lessons learned file
- Reviewed AIPO Document Creator coding log and lessons learned for cross-project insights

### Context
Thingstead is a local-first governance OS for AI projects. It currently supports one plan (CPMAI, 6 phases). The AIPO Document Creator is a separate Next.js app managing 39 governance document templates across an 8-phase lifecycle (P0–P7). The goal is to add the AIPO governance lifecycle as a second "track" inside Thingstead with deep integration of AIPO concepts (classification levels, approval signatures, document versioning).

### Key observations from AIPO project review
- AIPO has 8 phases (P0 Strategic Initiation → P7 Controlled Closure), each with risk-frequency color coding
- 39 DOCX templates map to artifacts: 8 Gate Records (one per phase) + 31 content templates
- Each template has structured sections, document control entries, and approval signatures with 10 defined roles
- AIPO uses a status state machine: DRAFT → IN_REVIEW → APPROVED → HISTORICAL
- Classification levels: PUBLIC, INTERNAL, CONFIDENTIAL, CUI, RESTRICTED

### Thingstead architecture notes
- Plan registry (`src/plans/`) supports multiple plans via `loader.js` and `registry.js`
- Each plan has a `definition.json`, `index.js` (project builder), and `validate.js`
- Project data stored in localStorage with schema versioning
- PhaseNav and PhaseDetail components are already plan-agnostic (dynamic phase iteration)
- **Critical gap**: `ProjectList.jsx` hardcodes `buildNewCpmaiProject()` — needs plan selection step

## 2026-03-01: Step 1 — AIPO Plan Definition

### What was done
- Created `src/plans/aipo-governance/definition.json` — 8 phases (P0–P7) with sequential gate model
- Created `src/plans/aipo-governance/index.js` — project builder with AIPO-specific fields:
  - `classification_level: "INTERNAL"` (project-level, one of PUBLIC/INTERNAL/CONFIDENTIAL/CUI/RESTRICTED)
  - `approvals` array per artifact (5 roles for gate records, 2 for others)
  - `doc_status: "DRAFT"` (document lifecycle state machine)
  - `doc_versions` array (version history per artifact)
- Created `src/plans/aipo-governance/validate.js` — validates 8 phases with canonical names, phase IDs 1..8

### Key decisions
- Gate records get 5 approval roles (EXEC_SPONSOR, SYS_OWNER, GOV_AUTHORITY, SEC_AUTHORITY, PROJECT_MGR) while other artifacts get 2 (EXEC_SPONSOR, PROJECT_MGR). This follows AIPO's tiered authority model without overloading every artifact.
- Used `templateSlug` field on artifacts to link back to the original DOCX template names, enabling future template rendering.

## 2026-03-01: Step 2 — AIPO Template Data

### What was done
- Created `src/data/aipo-template.json` — complete mapping of 39 AIPO templates to Thingstead artifacts across 8 phases
- Each phase includes color definitions (bg, text, riskColor) from AIPO's risk-frequency color scheme
- Includes lookup tables: classificationLevels, approvalRoles (10 roles), docStatuses with transitions

### Artifact distribution
P0(5), P1(4), P2(4), P3(4), P4(5), P5(5), P6(6), P7(7) = 40 artifacts total (39 templates + Lifecycle Overview supplemental in P0)

## 2026-03-01: Step 3 — Plan Registration

### What was done
- Added AIPO definition import to `src/plans/loader.js`
- Registered AIPO plan in `src/plans/registry.js` with builder and validator functions

## 2026-03-01: Step 4 — Project Creation Flow

### What was done
- Rewrote `ProjectList.jsx` to use `getPlan(planId).buildNewProject()` instead of hardcoded CPMAI builder
- Added plan selection step to create flow: name → plan → governance
- Rewrote `CreateModal.jsx` to include plan selection screen with plan cards showing label, phase count, gate model, and description
- Added CSS styles for plan cards in `ProjectList.module.css`

### Key decisions
- The plan selection uses `loadAllPlans()` from the registry, so any future plans are automatically available
- Back button on plan selection returns to name entry step

## 2026-03-01: Step 5 — Phase Colors & PhaseNav

### What was done
- Updated `PhaseNav.jsx` to apply AIPO phase colors as inline styles
- Active phases get colored background; inactive phases get colored left border
- Phase code (P0, P1, etc.) shown when `phase.code` is available
- Changed grid from `repeat(3, ...)` to `repeat(auto-fill, minmax(220px, 1fr))` to handle 8 phases

## 2026-03-01: Step 6 — AIPO-Specific Components

### What was done
- Created `ApprovalPanel.jsx` + CSS module — approval signatures table with Sign/Unsign workflow, inline name editing
- Created `ClassificationBadge.jsx` + CSS module — color-coded badge/select for classification levels
- Created `DocVersionHistory.jsx` + CSS module — document status badge with transitions, version timeline, "Create New Version" button

## 2026-03-01: Step 7 — ArtifactEditor Integration

### What was done
- Added AIPO plan detection to `ArtifactEditor.jsx` using `useProject()` context
- Conditionally renders `DocVersionHistory` after `WaiverPanel` for AIPO artifacts
- Conditionally renders `ApprovalPanel` for AIPO artifacts with approvals

## 2026-03-01: Step 8 — ClassificationBadge Header & Reducer

### What was done
- Added `UPDATE_PROJECT_META` action to `projectReducer.js` — generic project-level metadata updates with snapshot/undo support
- Integrated `ClassificationBadge` into `App.jsx` header, shown when `classification_level` exists on the project
- Badge is editable (dropdown select) and dispatches `UPDATE_PROJECT_META` on change

## 2026-03-01: Step 9 — Test Fix & Verification

### What was done
- Fixed integration tests in `appTestHelpers.js` — added plan selection click in `createProject` helper
- All 409 tests pass (29 test files), including all 5 integration tests
- Build succeeds cleanly (Vite production build)

### Deviation from plan
- Integration tests needed updating because the create flow now has a plan selection step. The fix was minimal: one extra click in the test helper to select CPMAI plan.

---

## 2026-03-02: TS-FEAT-004 — PMI Waterfall & PMI Agile Governance Tracks

### What was done

**Kernel layer** — Track-aware governance infrastructure:
- Created `src/kernel/governanceTracks.js` — four frozen enums: GovernanceTrack (CPMAI, CPMAI_PLUS, PMI_WATERFALL, PMI_AGILE), GateMode (SEQUENTIAL, ITERATIVE), ChangeControlMode (INFORMAL, FORMAL_CCB, BACKLOG_GOVERNED), GateEnforcementLevel (STRICT, RELEASE_BASED)
- Created `src/kernel/trackPolicies.js` — maps each track to behavioral config (gateMode, changeControlMode, baselineLocking, enforcementLevel, iterativePhaseIds, policyOverrides)
- Modified `src/kernel/policy.js` — added `compilePolicyForTrack(trackName, userOverrides)` for three-layer policy merging: DEFAULT_POLICY ← trackOverrides ← userOverrides
- Modified `src/kernel/gateEvaluator.js` — added optional 4th `trackPolicy` parameter to `isGateReady()`. Agile iterative phases (2-4) return ready immediately under ITERATIVE + RELEASE_BASED mode
- Modified `src/kernel/ledger.js` — added optional `track` parameter to `createGenesisEntry` and `appendEntry`, conditionally included in hash computation
- Modified `src/kernel/index.js` — exported all new public APIs

**Plan layer** — Two new 8-phase plans:
- Created `src/data/pmi-waterfall-template.json` — 8 phases (W1–W8), 34 artifacts, blue color scheme
- Created `src/data/pmi-agile-template.json` — 8 phases (A1–A8), phases 2-4 iterative, green color scheme
- Created `src/plans/pmi-waterfall/` — definition.json, index.js (builder), validate.js (validator)
- Created `src/plans/pmi-agile/` — definition.json, index.js (builder), validate.js (validator)
- Modified `src/plans/loader.js` and `src/plans/registry.js` — registered both new plans

**Tests** — 59 new tests across 8 files:
- `governanceTracks.test.js` (6), `trackPolicies.test.js` (6), `gateEvaluator.test.js` (10)
- Extended `policy.test.js` (+3), `ledger.test.js` (+4)
- `pmi-waterfall/index.test.js` (12), `pmi-waterfall/validate.test.js` (3)
- `pmi-agile/index.test.js` (12), `pmi-agile/validate.test.js` (3)

**Docs & version**:
- Bumped package.json from 0.9.0 → 0.10.0
- Added "Supported Governance Tracks" section to README.md

### Key decisions
- **Backward compatibility via optional trailing parameters**: `isGateReady(phase, resolver, policy, trackPolicy)` — existing 2-3 arg callers unchanged. Same pattern for ledger functions.
- **Conditional hash inclusion**: `track` field in ledger entries only included in hash computation when defined. Existing chains verify identically.
- **Template data is source of truth**: Waterfall has 34 artifacts (not the plan's estimate of 32) because the Planning phase has 5 non-gate artifacts.
- **CPMAI_PLUS as forward-compatible entry**: Maps to CPMAI behavior for now; included per contract requirements.
- **Agile iterative gate bypass**: Sprint-loop phases (2-4) skip completeness checks under ITERATIVE + RELEASE_BASED mode. Release gates (phase 5+) still enforce full completeness.

### Test results
- 505 unit tests pass (446 existing + 59 new), 0 failures
- All backward compatibility verified: existing CPMAI/AIPO callers unaffected
