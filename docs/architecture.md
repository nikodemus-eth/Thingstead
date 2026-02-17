# CPMAI Project Tracker — Architecture (Phase 1–3)

## 1. Project Overview and Purpose
The CPMAI Project Tracker is a single-user, local-first application for tracking AI project artifacts across the six PMI-CPMAI phases. It is deterministic, offline-capable, and intentionally human-mediated for cross-device sync (manual JSON export/import). The system minimizes hidden complexity and makes persistence and decision gating explicit.

This document is the canonical, authoritative source of truth for implementation in Phase 1–3. All generated code must conform to the constraints and decisions defined here.

Primary user: Nick (developer). Scope is single user, two devices, manual sync only. No other personas are in scope.

## 2. Technical Stack
- React 18+
- Vite
- JavaScript (ES2022) with JSX
- CSS Modules
- React Context + `useReducer`
- Vitest + React Testing Library

Hard constraints:
- No Redux, MobX, Tailwind, or backend.
- No inline styles.

## 3. Data Model (Project → Phase → Artifact)
### Project
```
{
  schemaVersion: 1,
  id: "uuid",
  name: "string",
  description: "string",
  created: "ISO8601",
  lastModified: "ISO8601",
  lastSavedFrom: "laptop | macmini",
  phases: Phase[]
}
```

### Phase
```
{
  id: 1-6,
  name: "string",
  goNoGoDecision: {
    status: "pending | go | no-go",
    decidedAt: "ISO8601 | null",
    notes: "string"
  },
  artifacts: Artifact[]
}
```

### Artifact
```
{
  id: "uuid",
  name: "string",
  category: "core | conditional | supplemental",
  isGateBlocking: boolean,
  status: "not-started | in-progress | in-review | complete | not-required",
  rationale: "string",
  notes: "string",
  lastModified: "ISO8601"
}
```

Rules:
- Artifact names are immutable.
- Exactly 6 phases.
- All timestamps are stored as UTC ISO8601.
- Markdown rendering is sanitized (no raw HTML).

## 4. Storage Strategy (Per-Project localStorage Keys)
Per-project storage keys. No global blob.

Keys:
- `cpmai-project-index`
- `cpmai-project-{projectId}`
- `cpmai-settings`

`cpmai-project-index`:
```
{
  "currentProjectId": "uuid",
  "projects": {
    "uuid": {
      "id": "uuid",
      "name": "string",
      "lastModified": "ISO8601",
      "lastSavedFrom": "laptop | macmini"
    }
  }
}
```

`cpmai-project-{projectId}`:
```
{
  "current": Project,
  "history": Project[],
  "historyIndex": number
}
```

`cpmai-settings`:
```
{
  "deviceId": "laptop | macmini",
  "autoSaveDelayMs": 2000,
  "theme": "light | dark"
}
```

## 5. AI Guardrails (Must / Must Not)
### Must
- Follow this document as the canonical source of truth.
- Preserve all hard constraints, data model shape, and storage keys.
- Use `src/data/cpmai-template.json` as the sole source of artifact definitions.
- Keep behavior deterministic and local-first.
- Make persistence and destructive actions explicit to the user.

### Must Not
- Introduce any backend, cloud sync, or real-time collaboration.
- Add authentication, multi-user support, or external integrations.
- Auto-merge or silently overwrite imported data.
- Hardcode artifact lists in UI components.
- Use Redux, MobX, Tailwind, or inline styles.
- Allow dynamic phase or artifact creation.

## 6. Implementation Roadmap (Phase 1–3)
Mandatory development order:
1. Data schema and validation
2. CPMAI template JSON
3. Storage wrapper
4. Schema migration
5. State reducer
6. Auto-save + history
7. Import/export
8. UI components
9. Gate logic
10. Cross-browser testing

Auto-save/undo/redo contract:
- Auto-save is debounced at 2000 ms and only saves when dirty.
- Auto-save is wrapped in try/catch and disabled if quota is exceeded.
- Undo/redo is snapshot-based; history entries are created only on successful auto-save.
- Max 5 snapshots per project. New changes clear forward history.

Import/export contract:
- Export is user-initiated only; prettified JSON.
- Import validates schema version, required fields, timestamps, and phase count.
- If `id` collision exists: prompt to overwrite, keep both (new UUID), or cancel. No silent overwrite.

## 7. Phase 1 Scope vs Phase 2 (Deferred Backend Features)
### Phase 1 (Local-First Core)
- Single-user, local-only application.
- Manual JSON export/import for cross-device sync.
- Deterministic go/no-go gates.
- Snapshot-based undo/redo.
- Sanitized markdown rendering (no raw HTML).

### Phase 2 (Deferred / Not Implemented Yet)
All backend or multi-user features are explicitly deferred, including:
- Authentication and identity
- Real-time sync or collaboration
- Cloud storage or backend services
- External integrations (Jira, Drive API, webhooks)
- Automatic conflict resolution

## 8. Phase 1–3 Constraints Summary
Hard constraints to enforce throughout implementation:
- Exactly six CPMAI phases.
- Artifact names immutable.
- No silent overwrites.
- No implicit persistence.
- No dynamic phase or artifact creation.
- No unsanitized markdown.

## 9. Source of Truth (Template)
All CPMAI artifact definitions live in `src/data/cpmai-template.json`. The app loads this template on project creation and never hardcodes artifact lists in UI components.

## 10. Success Criteria
- Data survives refresh.
- Undo/redo behaves predictably.
- Gate logic enforces constraints.
- Import never overwrites silently.
- Export produces valid JSON.
- No data loss paths identified.
