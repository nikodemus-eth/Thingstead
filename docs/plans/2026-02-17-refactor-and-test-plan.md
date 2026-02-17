# Thingstead Refactor & Test Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Clean up macOS resource fork files, add comprehensive unit tests for critical untested business logic, refactor oversized components into smaller focused pieces, and verify E2E tests pass.

**Architecture:** Stabilize-then-refactor. First fix the `._` file pollution causing test/lint failures. Then add unit tests for pure business logic (gate logic, artifact state, storage, import/export, reducer) to create a safety net. Then refactor ArtifactEditor (538 LOC) and ProjectList (633 LOC) into smaller components. Finally verify E2E tests pass.

**Tech Stack:** React 19, Vite (rolldown-vite), Vitest + React Testing Library, Playwright, CSS Modules, Context + useReducer.

---

### Task 1: Remove macOS resource fork files and update .gitignore

**Files:**
- Modify: `.gitignore`
- Delete: All `._*` files in `src/`, `e2e/`, `tools/`

**Step 1: Delete all `._` resource fork files**

```bash
find . -name '._*' -not -path './node_modules/*' -delete
```

**Step 2: Add `._*` to .gitignore**

Append to `.gitignore`:
```
# macOS resource forks
._*
```

**Step 3: Run tests to verify clean state**

Run: `npx vitest --run`
Expected: 8 test files, 25 tests, all pass, 0 failures.

Run: `npx eslint .`
Expected: 0 errors, 0 warnings.

Run: `npx vite build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add -A && git commit -m "chore: remove macOS ._ resource fork files, add to .gitignore"
```

---

### Task 2: Add unit tests for gateLogic.js

**Files:**
- Create: `src/utils/gateLogic.test.js`
- Read: `src/utils/gateLogic.js` (14 LOC), `src/utils/artifactState.js`

`gateLogic.js` exports `isGateReady(phase)`. It checks that every `isGateBlocking` artifact is either waived (rationale >= 20 chars) or complete (all required template fields satisfied). Used by GoNoGoDecision, GateOverview, PhaseNav.

**Step 1: Write the failing tests**

```js
import { describe, it, expect } from "vitest";
import { isGateReady } from "./gateLogic.js";

describe("isGateReady", () => {
  it("returns true when phase has no artifacts", () => {
    expect(isGateReady({ id: 1, artifacts: [] })).toBe(true);
  });

  it("returns true when phase has no gate-blocking artifacts", () => {
    const phase = {
      id: 1,
      artifacts: [
        { id: "a1", name: "Non-blocking", isGateBlocking: false },
      ],
    };
    expect(isGateReady(phase)).toBe(true);
  });

  it("returns false when a gate-blocking artifact is incomplete and not waived", () => {
    const phase = {
      id: 1,
      artifacts: [
        { id: "a1", name: "Blocking", isGateBlocking: true },
      ],
    };
    expect(isGateReady(phase)).toBe(false);
  });

  it("returns true when all gate-blocking artifacts are waived with 20+ char rationale", () => {
    const phase = {
      id: 1,
      artifacts: [
        {
          id: "a1",
          name: "Blocking",
          isGateBlocking: true,
          waiver: {
            waived: true,
            rationale: "This is a valid waiver rationale with enough characters.",
          },
        },
      ],
    };
    expect(isGateReady(phase)).toBe(true);
  });

  it("returns false when waiver rationale is too short", () => {
    const phase = {
      id: 1,
      artifacts: [
        {
          id: "a1",
          name: "Blocking",
          isGateBlocking: true,
          waiver: { waived: true, rationale: "too short" },
        },
      ],
    };
    expect(isGateReady(phase)).toBe(false);
  });

  it("returns true when gate-blocking artifact has enough written content (non-templated)", () => {
    const phase = {
      id: 1,
      artifacts: [
        {
          id: "a1",
          name: "NonTemplatedBlocking",
          isGateBlocking: true,
          rationale: "This rationale is long enough to count as complete artifact content.",
        },
      ],
    };
    expect(isGateReady(phase)).toBe(true);
  });

  it("handles null/undefined phase gracefully", () => {
    expect(isGateReady(null)).toBe(true);
    expect(isGateReady(undefined)).toBe(true);
    expect(isGateReady({})).toBe(true);
  });
});
```

**Step 2: Run test to verify they pass**

Run: `npx vitest --run src/utils/gateLogic.test.js`
Expected: All 7 tests pass (these test existing working code).

**Step 3: Commit**

```bash
git add src/utils/gateLogic.test.js && git commit -m "test: add unit tests for gateLogic.js"
```

---

### Task 3: Add unit tests for artifactState.js

**Files:**
- Create: `src/utils/artifactState.test.js`
- Read: `src/utils/artifactState.js` (75 LOC)

`artifactState.js` exports: `isArtifactWaived`, `isArtifactComplete`, `computeArtifactStatus`, `countPhaseWaivers`, `countPhaseCompletedArtifacts`. Core business logic — gate decisions depend on these.

**Step 1: Write the failing tests**

```js
import { describe, it, expect } from "vitest";
import {
  isArtifactWaived,
  isArtifactComplete,
  computeArtifactStatus,
  countPhaseWaivers,
  countPhaseCompletedArtifacts,
} from "./artifactState.js";

describe("isArtifactWaived", () => {
  it("returns false for null/undefined artifact", () => {
    expect(isArtifactWaived(null)).toBe(false);
    expect(isArtifactWaived(undefined)).toBe(false);
  });

  it("returns false when no waiver object", () => {
    expect(isArtifactWaived({ id: "a1" })).toBe(false);
  });

  it("returns false when waiver.waived is false", () => {
    expect(isArtifactWaived({ waiver: { waived: false, rationale: "long enough rationale text" } })).toBe(false);
  });

  it("returns false when rationale is under 20 chars", () => {
    expect(isArtifactWaived({ waiver: { waived: true, rationale: "short" } })).toBe(false);
  });

  it("returns true when waived with 20+ char rationale", () => {
    expect(isArtifactWaived({
      waiver: { waived: true, rationale: "This is a sufficiently long rationale." },
    })).toBe(true);
  });
});

describe("computeArtifactStatus", () => {
  it("returns not-started for null artifact", () => {
    expect(computeArtifactStatus(null, 1)).toBe("not-started");
  });

  it("returns not-started for empty artifact", () => {
    expect(computeArtifactStatus({ id: "a1", name: "Test" }, 1)).toBe("not-started");
  });

  it("returns waived when artifact has valid waiver", () => {
    expect(computeArtifactStatus({
      id: "a1",
      name: "Test",
      waiver: { waived: true, rationale: "Justified waiver with enough characters." },
    }, 1)).toBe("waived");
  });

  it("returns in-progress when artifact has some content", () => {
    expect(computeArtifactStatus({ id: "a1", name: "Test", rationale: "x" }, 1)).toBe("in-progress");
  });

  it("returns in-progress when artifact has comments", () => {
    expect(computeArtifactStatus({
      id: "a1",
      name: "Test",
      comments: [{ text: "A comment" }],
    }, 1)).toBe("in-progress");
  });
});

describe("countPhaseWaivers", () => {
  it("returns 0 for phase with no artifacts", () => {
    expect(countPhaseWaivers({ artifacts: [] })).toBe(0);
  });

  it("counts waived artifacts", () => {
    const phase = {
      artifacts: [
        { id: "a1", waiver: { waived: true, rationale: "Sufficient rationale for this waiver." } },
        { id: "a2" },
        { id: "a3", waiver: { waived: true, rationale: "Another valid waiver rationale text." } },
      ],
    };
    expect(countPhaseWaivers(phase)).toBe(2);
  });
});

describe("countPhaseCompletedArtifacts", () => {
  it("returns 0 for phase with no artifacts", () => {
    expect(countPhaseCompletedArtifacts({ id: 1, artifacts: [] })).toBe(0);
  });

  it("counts waived artifacts as completed", () => {
    const phase = {
      id: 1,
      artifacts: [
        { id: "a1", waiver: { waived: true, rationale: "Sufficient rationale for this waiver." } },
        { id: "a2", name: "Incomplete" },
      ],
    };
    expect(countPhaseCompletedArtifacts(phase)).toBe(1);
  });
});
```

**Step 2: Run tests**

Run: `npx vitest --run src/utils/artifactState.test.js`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/utils/artifactState.test.js && git commit -m "test: add unit tests for artifactState.js"
```

---

### Task 4: Add unit tests for templateHelpers.js

**Files:**
- Create: `src/utils/templateHelpers.test.js`
- Read: `src/utils/templateHelpers.js` (69 LOC)

`templateHelpers.js` exports: `getTemplateForArtifact`, `isRequiredFieldSatisfied`, `hasText`, `defaultCellValue`. These validate field completion per type (short_text, long_text, selection, date, checklist, table).

**Step 1: Write the tests**

```js
import { describe, it, expect } from "vitest";
import { isRequiredFieldSatisfied, hasText, defaultCellValue } from "./templateHelpers.js";

describe("hasText", () => {
  it("returns false for non-strings", () => {
    expect(hasText(null)).toBe(false);
    expect(hasText(undefined)).toBe(false);
    expect(hasText(42)).toBe(false);
  });

  it("returns false for empty or whitespace-only strings", () => {
    expect(hasText("")).toBe(false);
    expect(hasText("   ")).toBe(false);
  });

  it("returns true for non-empty strings", () => {
    expect(hasText("hello")).toBe(true);
  });
});

describe("isRequiredFieldSatisfied", () => {
  it("returns true when field is not required", () => {
    expect(isRequiredFieldSatisfied({ required: false, type: "short_text" }, "")).toBe(true);
    expect(isRequiredFieldSatisfied(null, "")).toBe(true);
  });

  it("validates short_text: needs non-empty string", () => {
    const field = { required: true, type: "short_text" };
    expect(isRequiredFieldSatisfied(field, "")).toBe(false);
    expect(isRequiredFieldSatisfied(field, "value")).toBe(true);
  });

  it("validates long_text: respects minLength", () => {
    const field = { required: true, type: "long_text", validation: { minLength: 20 } };
    expect(isRequiredFieldSatisfied(field, "short")).toBe(false);
    expect(isRequiredFieldSatisfied(field, "This is a long enough text value.")).toBe(true);
  });

  it("validates selection: needs non-empty", () => {
    const field = { required: true, type: "selection" };
    expect(isRequiredFieldSatisfied(field, "")).toBe(false);
    expect(isRequiredFieldSatisfied(field, "option-a")).toBe(true);
  });

  it("validates date: needs non-empty", () => {
    const field = { required: true, type: "date" };
    expect(isRequiredFieldSatisfied(field, "")).toBe(false);
    expect(isRequiredFieldSatisfied(field, "2025-01-01")).toBe(true);
  });

  it("validates checklist: needs at least one item", () => {
    const field = { required: true, type: "checklist" };
    expect(isRequiredFieldSatisfied(field, [])).toBe(false);
    expect(isRequiredFieldSatisfied(field, ["item-1"])).toBe(true);
  });

  it("validates table: needs at least one row with all columns filled", () => {
    const field = {
      required: true,
      type: "table",
      columns: [{ name: "Col A" }, { name: "Col B" }],
    };
    expect(isRequiredFieldSatisfied(field, [])).toBe(false);
    expect(isRequiredFieldSatisfied(field, [{ "Col A": "", "Col B": "" }])).toBe(false);
    expect(isRequiredFieldSatisfied(field, [{ "Col A": "val", "Col B": "val" }])).toBe(true);
  });
});

describe("defaultCellValue", () => {
  it("returns first option for selection columns", () => {
    expect(defaultCellValue({ type: "selection", options: ["a", "b"] })).toBe("a");
  });

  it("returns empty string for non-selection columns", () => {
    expect(defaultCellValue({ type: "text" })).toBe("");
    expect(defaultCellValue(null)).toBe("");
  });
});
```

**Step 2: Run tests**

Run: `npx vitest --run src/utils/templateHelpers.test.js`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/utils/templateHelpers.test.js && git commit -m "test: add unit tests for templateHelpers.js"
```

---

### Task 5: Add unit tests for storage.js

**Files:**
- Create: `src/utils/storage.test.js`
- Read: `src/utils/storage.js` (192 LOC)

`storage.js` wraps localStorage with atomic transaction support. Critical for data integrity. Tests run against jsdom's localStorage (provided by vitest setup).

**Step 1: Write the tests**

```js
import { describe, it, expect, beforeEach } from "vitest";
import {
  saveProjectIndex,
  loadProjectIndex,
  saveProject,
  loadProject,
  deleteProject,
  saveProjectAndIndex,
  deleteProjectAndIndex,
  saveSettings,
  loadSettings,
  getStorageUsage,
} from "./storage.js";

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("project index", () => {
    it("round-trips project index", () => {
      const index = { currentProjectId: "p1", projects: { p1: { id: "p1", name: "Test" } } };
      saveProjectIndex(index);
      expect(loadProjectIndex()).toEqual(index);
    });

    it("returns null when no index saved", () => {
      expect(loadProjectIndex()).toBeNull();
    });
  });

  describe("project data", () => {
    it("round-trips project data", () => {
      const data = { current: { id: "p1", name: "Test" }, history: [], historyIndex: -1 };
      saveProject("p1", data);
      expect(loadProject("p1")).toEqual(data);
    });

    it("returns null for missing project", () => {
      expect(loadProject("nonexistent")).toBeNull();
    });

    it("deletes project", () => {
      saveProject("p1", { current: { id: "p1" } });
      expect(loadProject("p1")).not.toBeNull();
      deleteProject("p1");
      expect(loadProject("p1")).toBeNull();
    });
  });

  describe("settings", () => {
    it("round-trips settings", () => {
      const settings = { deviceId: "test-device", theme: "dark" };
      saveSettings(settings);
      expect(loadSettings()).toEqual(settings);
    });
  });

  describe("atomic operations", () => {
    it("saveProjectAndIndex writes both atomically", () => {
      const data = { current: { id: "p1" }, history: [], historyIndex: -1 };
      const index = { currentProjectId: "p1", projects: { p1: { id: "p1" } } };
      const result = saveProjectAndIndex("p1", data, index);
      expect(result).not.toBeNull();
      expect(loadProject("p1")).toEqual(data);
      expect(loadProjectIndex()).toEqual(index);
    });

    it("deleteProjectAndIndex removes project and updates index", () => {
      saveProject("p1", { current: { id: "p1" } });
      const newIndex = { currentProjectId: null, projects: {} };
      deleteProjectAndIndex("p1", newIndex);
      expect(loadProject("p1")).toBeNull();
      expect(loadProjectIndex()).toEqual(newIndex);
    });
  });

  describe("getStorageUsage", () => {
    it("returns zero usage when storage is empty", () => {
      const usage = getStorageUsage();
      expect(usage.usedBytes).toBe(0);
      expect(usage.isWarning).toBe(false);
      expect(usage.isCritical).toBe(false);
    });

    it("reports non-zero usage after saving", () => {
      saveProjectIndex({ projects: {} });
      const usage = getStorageUsage();
      expect(usage.usedBytes).toBeGreaterThan(0);
    });
  });
});
```

**Step 2: Run tests**

Run: `npx vitest --run src/utils/storage.test.js`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/utils/storage.test.js && git commit -m "test: add unit tests for storage.js"
```

---

### Task 6: Add unit tests for importExport.js

**Files:**
- Create: `src/utils/importExport.test.js`
- Read: `src/utils/importExport.js` (140 LOC)

`importExport.js` exports: `validateImport`, `importProject`, `exportProjectToPDF`, `buildExportBundle`, `exportProject`. Tests focus on `validateImport` and `importProject` (pure functions that don't need DOM).

**Step 1: Write the tests**

```js
import { describe, it, expect } from "vitest";
import { validateImport, importProject } from "./importExport.js";
import { normalizeProject } from "./normalizeProject.js";

function makeMinimalProject(overrides = {}) {
  return normalizeProject({
    id: "test-id",
    name: "Test Project",
    schemaVersion: 1,
    plan_id: "cpmai",
    created: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    phases: [],
    ...overrides,
  });
}

describe("validateImport", () => {
  it("rejects invalid JSON", () => {
    const result = validateImport("not json{{{");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid JSON.");
  });

  it("rejects unsupported bundle schemaVersion", () => {
    const bundle = JSON.stringify({ schemaVersion: 99, project: makeMinimalProject() });
    const result = validateImport(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/unsupported.*schemaversion/i);
  });

  it("accepts a valid raw project JSON", () => {
    const project = makeMinimalProject();
    const result = validateImport(JSON.stringify(project));
    expect(result.valid).toBe(true);
    expect(result.project).not.toBeNull();
  });
});

describe("importProject", () => {
  it("returns invalid for bad JSON", () => {
    const result = importProject("{broken", {});
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("Invalid JSON.");
  });

  it("detects collision with existing projects", () => {
    const project = makeMinimalProject({ id: "existing-id" });
    const existing = { "existing-id": { id: "existing-id", name: "Old" } };
    const result = importProject(JSON.stringify(project), existing);
    expect(result.status).toBe("collision");
    expect(result.project.id).toBe("existing-id");
  });

  it("returns success for valid non-colliding import", () => {
    const project = makeMinimalProject({ id: "new-id" });
    const result = importProject(JSON.stringify(project), {});
    expect(result.status).toBe("success");
    expect(result.project.id).toBe("new-id");
  });
});
```

**Step 2: Run tests**

Run: `npx vitest --run src/utils/importExport.test.js`
Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/utils/importExport.test.js && git commit -m "test: add unit tests for importExport.js"
```

---

### Task 7: Extract reducer from ProjectContext and add tests

**Files:**
- Create: `src/state/projectReducer.js`
- Create: `src/state/projectReducer.test.js`
- Modify: `src/contexts/ProjectContext.jsx`

Extract the pure reducer function and its helpers from ProjectContext.jsx into a separate module so they can be unit-tested without rendering React.

**Step 1: Create `src/state/projectReducer.js`**

Move these functions from `src/contexts/ProjectContext.jsx`:
- `initialState`
- `cloneProject`
- `updateArtifactInProject`
- `updateArtifactWaiverInProject`
- `updateGateDecisionInProject`
- `clampHistory`
- `createSnapshot`
- `reducer`

The new file exports `{ reducer, initialState }` plus the helper functions for testing.

**Step 2: Update `src/contexts/ProjectContext.jsx`**

Replace the removed code with:
```js
import { reducer, initialState } from "../state/projectReducer.js";
```

Everything else (React context, effects, LAN sync, useAutoSave) stays in ProjectContext.jsx.

**Step 3: Run existing tests to verify no regression**

Run: `npx vitest --run`
Expected: All existing 25 tests pass (including integration test).

**Step 4: Write reducer unit tests**

```js
import { describe, it, expect } from "vitest";
import { reducer, initialState } from "./projectReducer.js";

function makeState(overrides = {}) {
  return { ...initialState, ...overrides };
}

function makeProject(overrides = {}) {
  return {
    id: "p1",
    name: "Test",
    phases: [
      {
        id: 1,
        name: "Phase 1",
        artifacts: [
          { id: "a1", name: "Artifact 1", isGateBlocking: true },
        ],
      },
    ],
    audit_log: [],
    ...overrides,
  };
}

describe("projectReducer", () => {
  describe("LOAD_PROJECT_INDEX", () => {
    it("loads projects and currentProjectId", () => {
      const next = reducer(initialState, {
        type: "LOAD_PROJECT_INDEX",
        payload: { projects: { p1: { id: "p1" } }, currentProjectId: "p1" },
      });
      expect(next.projects).toEqual({ p1: { id: "p1" } });
      expect(next.currentProjectId).toBe("p1");
    });
  });

  describe("UPDATE_ARTIFACT", () => {
    it("updates artifact and creates history snapshot", () => {
      const project = makeProject();
      const state = makeState({
        currentProject: project,
        history: [project],
        historyIndex: 0,
      });
      const next = reducer(state, {
        type: "UPDATE_ARTIFACT",
        payload: { phaseId: 1, artifactId: "a1", changes: { rationale: "Updated" } },
      });
      expect(next.currentProject.phases[0].artifacts[0].rationale).toBe("Updated");
      expect(next.isDirty).toBe(true);
      expect(next.historyIndex).toBe(1);
    });

    it("returns state unchanged when no current project", () => {
      const next = reducer(initialState, {
        type: "UPDATE_ARTIFACT",
        payload: { phaseId: 1, artifactId: "a1", changes: {} },
      });
      expect(next).toBe(initialState);
    });
  });

  describe("UNDO / REDO", () => {
    it("undo reverts to previous snapshot", () => {
      const v1 = makeProject({ name: "v1" });
      const v2 = makeProject({ name: "v2" });
      const state = makeState({
        currentProject: v2,
        history: [v1, v2],
        historyIndex: 1,
      });
      const next = reducer(state, { type: "UNDO" });
      expect(next.currentProject.name).toBe("v1");
      expect(next.historyIndex).toBe(0);
    });

    it("redo moves forward in history", () => {
      const v1 = makeProject({ name: "v1" });
      const v2 = makeProject({ name: "v2" });
      const state = makeState({
        currentProject: v1,
        history: [v1, v2],
        historyIndex: 0,
      });
      const next = reducer(state, { type: "REDO" });
      expect(next.currentProject.name).toBe("v2");
      expect(next.historyIndex).toBe(1);
    });

    it("undo at index 0 returns state unchanged", () => {
      const state = makeState({ historyIndex: 0, history: [makeProject()] });
      expect(reducer(state, { type: "UNDO" })).toBe(state);
    });

    it("redo at end of history returns state unchanged", () => {
      const state = makeState({ historyIndex: 0, history: [makeProject()] });
      expect(reducer(state, { type: "REDO" })).toBe(state);
    });
  });

  describe("CREATE_PROJECT / DELETE_PROJECT", () => {
    it("creates a project and sets it as current", () => {
      const project = makeProject();
      const next = reducer(initialState, {
        type: "CREATE_PROJECT",
        payload: {
          projectId: "p1",
          projectSummary: { id: "p1", name: "Test" },
          projectData: { current: project, history: [], historyIndex: -1 },
        },
      });
      expect(next.projects.p1).toBeDefined();
      expect(next.currentProjectId).toBe("p1");
      expect(next.currentProject).not.toBeNull();
    });

    it("deletes a project and clears current if it was selected", () => {
      const state = makeState({
        projects: { p1: { id: "p1" } },
        currentProjectId: "p1",
        currentProject: makeProject(),
        history: [makeProject()],
        historyIndex: 0,
      });
      const next = reducer(state, { type: "DELETE_PROJECT", payload: { projectId: "p1" } });
      expect(next.projects.p1).toBeUndefined();
      expect(next.currentProjectId).toBeNull();
      expect(next.currentProject).toBeNull();
    });
  });

  describe("history clamping", () => {
    it("caps history at 5 snapshots", () => {
      const project = makeProject();
      let state = makeState({
        currentProject: project,
        history: [project],
        historyIndex: 0,
      });
      // Push 6 more updates (7 total), history should cap at 5.
      for (let i = 0; i < 6; i++) {
        state = reducer(state, {
          type: "UPDATE_ARTIFACT",
          payload: { phaseId: 1, artifactId: "a1", changes: { rationale: `Update ${i}` } },
        });
      }
      expect(state.history.length).toBeLessThanOrEqual(5);
    });
  });
});
```

**Step 5: Run all tests**

Run: `npx vitest --run`
Expected: All tests pass (existing + new reducer tests).

**Step 6: Commit**

```bash
git add src/state/projectReducer.js src/state/projectReducer.test.js src/contexts/ProjectContext.jsx && git commit -m "refactor: extract reducer from ProjectContext, add unit tests"
```

---

### Task 8: Extract shared status helpers

**Files:**
- Create: `src/utils/statusHelpers.js`
- Create: `src/utils/statusHelpers.test.js`
- Modify: `src/components/ArtifactList.jsx` (replace inline `statusGlyph`/`artifactGlyph`)
- Modify: `src/components/widgets/GateOverview.jsx` (replace inline `gateGlyph`/`gateStatus`)

**Step 1: Create `src/utils/statusHelpers.js`**

```js
export function statusGlyph(status) {
  if (status === "complete") return "check";
  if (status === "waived") return "waiver";
  if (status === "in-progress") return "modify";
  return "pending";
}

export function statusLabel(status) {
  if (status === "waived") return "Waived";
  if (status === "complete") return "Complete";
  if (status === "in-progress") return "In Progress";
  return "Not Started";
}

export function artifactGlyph(category) {
  if (category === "conditional") return "field";
  if (category === "supplemental") return "template";
  return "artifact";
}
```

**Step 2: Write tests**

```js
import { describe, it, expect } from "vitest";
import { statusGlyph, statusLabel, artifactGlyph } from "./statusHelpers.js";

describe("statusGlyph", () => {
  it("maps statuses to correct glyphs", () => {
    expect(statusGlyph("complete")).toBe("check");
    expect(statusGlyph("waived")).toBe("waiver");
    expect(statusGlyph("in-progress")).toBe("modify");
    expect(statusGlyph("not-started")).toBe("pending");
    expect(statusGlyph("unknown")).toBe("pending");
  });
});

describe("statusLabel", () => {
  it("maps statuses to correct labels", () => {
    expect(statusLabel("complete")).toBe("Complete");
    expect(statusLabel("waived")).toBe("Waived");
    expect(statusLabel("in-progress")).toBe("In Progress");
    expect(statusLabel("not-started")).toBe("Not Started");
  });
});

describe("artifactGlyph", () => {
  it("maps categories to correct glyphs", () => {
    expect(artifactGlyph("core")).toBe("artifact");
    expect(artifactGlyph("conditional")).toBe("field");
    expect(artifactGlyph("supplemental")).toBe("template");
  });
});
```

**Step 3: Update ArtifactList.jsx — replace inline functions with imports**

Remove the `artifactGlyph` and `statusGlyph` functions (lines 9-20) and add:
```js
import { statusGlyph, artifactGlyph } from "../utils/statusHelpers.js";
```

**Step 4: Update GateOverview.jsx — replace inline `gateGlyph`**

The `gateGlyph` function in GateOverview maps gate statuses (locked/go/no-go/ready) which is distinct from artifact status. Leave it as-is since it's phase-gate-specific, not a duplicate.

**Step 5: Update ArtifactEditor.jsx — replace inline statusLabel**

Replace the inline `statusLabel` computation (lines 150-157) with:
```js
import { statusLabel } from "../utils/statusHelpers.js";
```
Then use `statusLabel(computedStatus)` directly.

**Step 6: Run all tests**

Run: `npx vitest --run`
Expected: All tests pass.

**Step 7: Commit**

```bash
git add src/utils/statusHelpers.js src/utils/statusHelpers.test.js src/components/ArtifactList.jsx src/components/ArtifactEditor.jsx && git commit -m "refactor: extract shared status helpers, remove duplication"
```

---

### Task 9: Extract WaiverPanel from ArtifactEditor

**Files:**
- Create: `src/components/WaiverPanel.jsx`
- Create: `src/components/WaiverPanel.test.jsx`
- Modify: `src/components/ArtifactEditor.jsx`

**Step 1: Create `src/components/WaiverPanel.jsx`**

Move the `WaiverPanel` function component (lines 64-123 of ArtifactEditor.jsx) into its own file. It takes props: `artifact`, `actorId`, `onWaiverChange`. Uses `styles` from `ArtifactList.module.css` and `GlyphIcon`.

```jsx
import { useState } from "react";
import GlyphIcon from "./GlyphIcon.jsx";
import styles from "./ArtifactList.module.css";

export default function WaiverPanel({ artifact, actorId, onWaiverChange }) {
  const existing = artifact?.waiver?.waived ? artifact.waiver : null;
  const [waived, setWaived] = useState(Boolean(existing));
  const [rationale, setRationale] = useState(existing?.rationale || "");
  const [error, setError] = useState("");

  const apply = () => {
    if (!waived) {
      onWaiverChange(null);
      setError("");
      return;
    }
    const trimmed = (rationale || "").trim();
    if (trimmed.replace(/\s+/g, "").length < 20) {
      setError("Waiver rationale must be at least 20 non-whitespace characters.");
      return;
    }
    setError("");
    onWaiverChange({
      waived: true,
      rationale: trimmed,
      waived_at: new Date().toISOString(),
      waived_by: actorId,
    });
  };

  return (
    <div className={styles.field}>
      <label className={styles.templateLabel}>
        <GlyphIcon name="waiver" size={14} /> Waiver
      </label>
      <label className={styles.checkItem}>
        <input
          type="checkbox"
          checked={waived}
          onChange={(e) => {
            setWaived(e.target.checked);
            if (!e.target.checked) setRationale("");
            if (error) setError("");
          }}
        />
        Waive this artifact (explicitly)
      </label>
      {waived && (
        <>
          <label htmlFor="waiver-rationale">Waiver rationale (20+ chars)</label>
          <textarea
            id="waiver-rationale"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
          />
        </>
      )}
      {error && <div className={styles.validationError}>{error}</div>}
      <button type="button" className={styles.tableAdd} onClick={apply}>
        {waived ? "Apply Waiver" : "Remove Waiver"}
      </button>
    </div>
  );
}
```

**Step 2: Update ArtifactEditor.jsx**

Remove the `WaiverPanel` function (lines 64-123). Add import:
```jsx
import WaiverPanel from "./WaiverPanel.jsx";
```

**Step 3: Write WaiverPanel test**

```jsx
import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WaiverPanel from "./WaiverPanel.jsx";

describe("WaiverPanel", () => {
  const defaultProps = {
    artifact: { id: "a1", name: "Test" },
    actorId: "owner:device1",
    onWaiverChange: vi.fn(),
  };

  it("renders waiver checkbox", () => {
    render(<WaiverPanel {...defaultProps} />);
    expect(screen.getByLabelText(/waive this artifact/i)).toBeInTheDocument();
  });

  it("shows rationale field when checkbox is checked", async () => {
    const user = userEvent.setup();
    render(<WaiverPanel {...defaultProps} />);
    await user.click(screen.getByLabelText(/waive this artifact/i));
    expect(screen.getByLabelText(/waiver rationale/i)).toBeInTheDocument();
  });

  it("shows error when rationale is too short", async () => {
    const user = userEvent.setup();
    render(<WaiverPanel {...defaultProps} />);
    await user.click(screen.getByLabelText(/waive this artifact/i));
    await user.type(screen.getByLabelText(/waiver rationale/i), "short");
    await user.click(screen.getByRole("button", { name: /apply waiver/i }));
    expect(screen.getByText(/at least 20/i)).toBeInTheDocument();
  });

  it("calls onWaiverChange with valid waiver", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<WaiverPanel {...defaultProps} onWaiverChange={onChange} />);
    await user.click(screen.getByLabelText(/waive this artifact/i));
    await user.type(
      screen.getByLabelText(/waiver rationale/i),
      "This is a sufficiently long waiver rationale for testing."
    );
    await user.click(screen.getByRole("button", { name: /apply waiver/i }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ waived: true, rationale: expect.any(String) })
    );
  });

  it("calls onWaiverChange with null when removing waiver", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<WaiverPanel {...defaultProps} onWaiverChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /remove waiver/i }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
```

**Step 4: Run all tests**

Run: `npx vitest --run`
Expected: All tests pass.

**Step 5: Commit**

```bash
git add src/components/WaiverPanel.jsx src/components/WaiverPanel.test.jsx src/components/ArtifactEditor.jsx && git commit -m "refactor: extract WaiverPanel from ArtifactEditor"
```

---

### Task 10: Extract fieldGuidance utility from ArtifactEditor

**Files:**
- Create: `src/utils/fieldGuidance.js`
- Modify: `src/components/ArtifactEditor.jsx`

**Step 1: Create `src/utils/fieldGuidance.js`**

Move `guidanceForTemplateField` (lines 14-40 of ArtifactEditor.jsx) into this file.

```js
export function guidanceForTemplateField(field, isArtifactGateBlocking) {
  const why = field.helpText || "Capture the information needed to evaluate and govern this artifact.";

  let goodLooksLike = "Provide clear, specific, auditable content.";
  if (field.type === "short_text") goodLooksLike = "Keep it specific and unambiguous.";
  if (field.type === "long_text") {
    const minLength = Number(field?.validation?.minLength || 0);
    goodLooksLike = minLength
      ? `Write at least ${minLength} characters. Use concrete facts and measurable details.`
      : "Write with enough detail that another reviewer could validate the claim.";
  }
  if (field.type === "selection") goodLooksLike = "Pick the single best-fit option. If uncertain, choose the most conservative choice.";
  if (field.type === "date") goodLooksLike = "Use a real date (not a placeholder).";
  if (field.type === "checklist") goodLooksLike = "Select at least one item that applies, and ensure it is defensible.";
  if (field.type === "table") goodLooksLike = "Add at least one row and fill every column in that row.";

  const gateText = (() => {
    const fieldGate = field.gateBlocking === true;
    if (!isArtifactGateBlocking && !fieldGate) {
      return "This field does not affect phase gate readiness directly, but it contributes to artifact completion.";
    }
    if (fieldGate) return "This field is gate-blocking: it must be satisfied for this artifact to unlock the phase gate.";
    return "This artifact is gate-blocking. Completing it helps unlock the phase gate.";
  })();

  return { why, goodLooksLike, gateText };
}
```

**Step 2: Update ArtifactEditor.jsx**

Remove the `guidanceForTemplateField` function. Add import:
```js
import { guidanceForTemplateField } from "../utils/fieldGuidance.js";
```

**Step 3: Run tests**

Run: `npx vitest --run`
Expected: All pass.

**Step 4: Commit**

```bash
git add src/utils/fieldGuidance.js src/components/ArtifactEditor.jsx && git commit -m "refactor: extract fieldGuidance utility from ArtifactEditor"
```

---

### Task 11: Extract ProjectList modals into separate components

**Files:**
- Create: `src/components/modals/CreateModal.jsx`
- Create: `src/components/modals/DeleteModal.jsx`
- Create: `src/components/modals/CollisionModal.jsx`
- Create: `src/components/modals/ShareModal.jsx`
- Modify: `src/components/ProjectList.jsx`

**Step 1: Create modal components**

Each modal receives its data and callbacks as props. The modals use `styles` from `ProjectList.module.css` and `GlyphIcon`.

**CreateModal.jsx** — receives `createModal` state, `setCreateModal`, `onSubmitName`, `onSubmitGovernance`.

**DeleteModal.jsx** — receives `onConfirm`, `onCancel`.

**CollisionModal.jsx** — receives `onResolve` (called with "overwrite", "keep-both", or "cancel").

**ShareModal.jsx** — receives `shareModal` state, `onClose`, `onRunAction`, transport objects.

**Step 2: Update ProjectList.jsx**

Replace inline modal JSX with component imports. Move share-modal useLayoutEffect into ShareModal. ProjectList.jsx should drop from ~633 LOC to ~200-250 LOC.

**Step 3: Run all tests**

Run: `npx vitest --run`
Expected: All pass.

Run: `npx vite build`
Expected: Build succeeds.

**Step 4: Commit**

```bash
git add src/components/modals/ src/components/ProjectList.jsx && git commit -m "refactor: extract ProjectList modals into separate components"
```

---

### Task 12: Run and fix E2E tests

**Files:**
- Read: `playwright.config.js`, `e2e/*.spec.js`
- Modify: Any files needed to fix failures

**Step 1: Install Playwright browsers**

```bash
npx playwright install
```

**Step 2: Run E2E tests (chromium only first for speed)**

```bash
npx playwright test --project=chromium
```

**Step 3: Fix any failures**

Common issues after refactoring:
- Selector changes (if button text changed)
- Modal class name changes
- Import path issues in built output

Fix each failure, re-run the specific test to confirm.

**Step 4: Run full E2E suite**

```bash
npx playwright test
```

Expected: All specs pass across chromium, firefox, webkit, webkit-mobile.

**Step 5: Commit**

```bash
git add -A && git commit -m "fix: resolve E2E test failures after refactoring"
```

(Skip this commit if no E2E fixes were needed.)

---

### Task 13: Final verification

**Step 1: Run all unit tests**

```bash
npx vitest --run
```

Expected: All tests pass (existing + ~50 new tests).

**Step 2: Run lint**

```bash
npx eslint .
```

Expected: 0 errors.

**Step 3: Run build**

```bash
npx vite build
```

Expected: Build succeeds.

**Step 4: Run E2E**

```bash
npx playwright test --project=chromium
```

Expected: All pass.

**Step 5: Verify component sizes**

Check that:
- `ArtifactEditor.jsx` < 200 LOC
- `ProjectList.jsx` < 250 LOC
- No component exceeds 300 LOC

**Step 6: Final commit**

```bash
git add -A && git commit -m "chore: final verification - all tests pass, lint clean, build succeeds"
```

(Skip if no changes needed.)
