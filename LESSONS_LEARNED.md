# Lessons Learned — Thingstead+ (AIPO Governance Track Integration)

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
