# Lessons Learned — Thingstead+

## Inherited from AIPO Document Creator

### Phase Color Readability
- Phase colors need WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Light backgrounds (White/Gray, Yellow) need dark text; most other phases use white text
- Dual color system works well: primary `bg`/`text` for banners + lighter variants for cards

### Template-Driven Architecture
- One generic model for all artifact types is far better than one model per template
- Stable identifier keys (like `sectionKey`) enable data portability across template versions
- Template versioning should be forward-only (new version, never mutate old) to preserve audit trail

### Document Versioning Strategy
- Deep-copy in a single transaction is essential for atomicity
- Self-referential `previousVersionId` creates a natural linked list for version history
- Resetting approval signatures on new versions preserves workflow structure while requiring fresh sign-offs

### Status State Machine
- Server/storage-side validation of allowed transitions prevents invalid states
- One-way transitions (DRAFT→IN_REVIEW→APPROVED→HISTORICAL) simplify the model
- Document status is separate from artifact completion status — they serve different purposes

## Thingstead-Specific Insights

### Plan Registry Pattern
- Static imports in `loader.js` are required for Vite bundler compatibility (no dynamic `import()`)
- Plan definitions are pure metadata (JSON); builders are code (JS functions)
- Plan validation is separate from plan building — keeps concerns clean
- The registry maps plan IDs to builder+validator pairs; the loader maps IDs to definitions

### Data Model Extensibility
- Thingstead's project schema allows arbitrary top-level keys — AIPO-specific fields can be added without schema version bumps
- Existing components null-check new fields naturally — plan-specific features degrade gracefully
- The reducer works generically with phases and artifacts — no hardcoded phase counts

### Integration Test Fragility
- Integration tests that encode the exact creation flow (click order) break when the flow changes
- Adding a plan selection step between name and governance required updating the test helper
- Fix: test helpers should be the single source of truth for multi-step flows — change one helper, fix all tests

### Multi-Plan UI Considerations
- PhaseNav grid must be flexible: `repeat(auto-fill, minmax(220px, 1fr))` handles both 6 and 8+ phases
- Phase colors should be data-driven (stored per phase in template data), not hardcoded per plan
- Plan-specific components (ApprovalPanel, DocVersionHistory, ClassificationBadge) are conditionally rendered based on `plan_id` — zero overhead for plans that don't use them

### Reducer Design for Plan Extensions
- A generic `UPDATE_PROJECT_META` action handles project-level field changes without needing plan-specific actions
- The snapshot-push pattern for undo/redo must be followed by ALL mutations — classification level changes are undoable just like artifact edits

## Track-Aware Kernel Design (TS-FEAT-004)

### Optional Trailing Parameters for Backward Compatibility
- Extending function signatures with optional trailing parameters (`isGateReady(phase, resolver, policy, trackPolicy)`) preserves all existing call sites without changes
- This works because JavaScript passes `undefined` for missing arguments, and the new code checks for `undefined` before branching
- Same pattern applied to ledger functions (`createGenesisEntry`, `appendEntry`) — existing callers pass fewer args, new code handles `undefined` gracefully

### Conditional Hash Computation
- Ledger hashes must be backward-compatible: existing chains must produce identical hashes after the code change
- Solution: only include new fields in hash computation when they are defined (`if (entry.track !== undefined)`)
- `stableStringify` already skips `undefined` values, so omitting the field entirely preserves the hash input

### Track Policy Layering
- Three-layer policy merge (DEFAULT ← track ← user) gives clear precedence without complex inheritance
- Track overrides are declarative data in `trackPolicies.js`, not scattered conditionals
- `deepMerge` (already in the codebase) handles nested policy objects correctly

### Template Data Counts vs Plan Estimates
- Template JSON files are the canonical source of truth for artifact counts — plan documentation is an approximation
- Tests should assert against what the builder actually produces (from template data), not what the design doc estimated
- The waterfall plan estimated 32 artifacts but the template has 34; the test should match reality

### Iterative Gate Bypass Pattern
- Agile sprint-loop phases need different gate semantics than waterfall phases
- The cleanest approach: check track policy at the top of `isGateReady()` and return early for iterative phases
- This keeps the core sequential logic untouched — no mode flags threading through the evaluation pipeline
- Release gates (non-iterative phases) still enforce full completeness even in agile tracks
