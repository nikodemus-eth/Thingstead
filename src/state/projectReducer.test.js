import { describe, it, expect } from "vitest";
import {
  reducer,
  initialState,
  cloneProject,
  updateArtifactInProject,
  updateArtifactWaiverInProject,
  updateGateDecisionInProject,
  clampHistory,
  createSnapshot,
} from "./projectReducer.js";

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

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

describe("cloneProject", () => {
  it("deep-clones a project via JSON round-trip", () => {
    const original = makeProject({ nested: { a: 1 } });
    const cloned = cloneProject(original);
    expect(cloned).toEqual(original);
    expect(cloned).not.toBe(original);
    expect(cloned.nested).not.toBe(original.nested);
  });
});

describe("updateArtifactInProject", () => {
  it("immutably merges changes into the matching artifact", () => {
    const project = makeProject();
    const updated = updateArtifactInProject(project, 1, "a1", { rationale: "Done" });
    expect(updated.phases[0].artifacts[0].rationale).toBe("Done");
    // Original is untouched.
    expect(project.phases[0].artifacts[0].rationale).toBeUndefined();
    // Different references.
    expect(updated).not.toBe(project);
    expect(updated.phases).not.toBe(project.phases);
  });

  it("returns project unchanged when phaseId is not found", () => {
    const project = makeProject();
    const result = updateArtifactInProject(project, 999, "a1", { rationale: "x" });
    expect(result).toBe(project);
  });

  it("returns project unchanged when artifactId is not found", () => {
    const project = makeProject();
    const result = updateArtifactInProject(project, 1, "missing", { rationale: "x" });
    expect(result).toBe(project);
  });
});

describe("updateArtifactWaiverInProject", () => {
  it("sets waiver on artifact and appends audit event", () => {
    const project = makeProject();
    const waiver = { waived: true, rationale: "Risk accepted." };
    const updated = updateArtifactWaiverInProject(project, 1, "a1", waiver, "user-1");
    expect(updated.phases[0].artifacts[0].waiver).toEqual(waiver);
    expect(updated.audit_log.length).toBe(1);
    expect(updated.audit_log[0].type).toBe("WAIVER_APPLIED");
    expect(updated.audit_log[0].actor_id).toBe("user-1");
    expect(updated.audit_log[0].artifact_id).toBe("a1");
  });

  it("records WAIVER_REMOVED when waiver.waived is false", () => {
    const project = makeProject({
      phases: [
        {
          id: 1,
          name: "Phase 1",
          artifacts: [
            { id: "a1", name: "A1", waiver: { waived: true, rationale: "old" } },
          ],
        },
      ],
    });
    const waiver = { waived: false, rationale: "" };
    const updated = updateArtifactWaiverInProject(project, 1, "a1", waiver, "user-2");
    expect(updated.audit_log[0].type).toBe("WAIVER_REMOVED");
  });

  it("returns project unchanged when phaseId not found", () => {
    const project = makeProject();
    const result = updateArtifactWaiverInProject(project, 999, "a1", {}, "u");
    expect(result).toBe(project);
  });

  it("returns project unchanged when artifactId not found", () => {
    const project = makeProject();
    const result = updateArtifactWaiverInProject(project, 1, "missing", {}, "u");
    expect(result).toBe(project);
  });
});

describe("updateGateDecisionInProject", () => {
  it("sets goNoGoDecision on the matching phase", () => {
    const project = makeProject();
    const decision = { decision: "GO", decidedBy: "user-1" };
    const updated = updateGateDecisionInProject(project, 1, decision);
    expect(updated.phases[0].goNoGoDecision).toEqual(decision);
    expect(updated).not.toBe(project);
  });

  it("returns project unchanged when phaseId not found", () => {
    const project = makeProject();
    const result = updateGateDecisionInProject(project, 999, { decision: "GO" });
    expect(result).toBe(project);
  });
});

describe("clampHistory", () => {
  it("returns unchanged when history length <= maxSnapshots", () => {
    const history = [1, 2, 3];
    const result = clampHistory(history, 2, 5);
    expect(result.history).toBe(history);
    expect(result.historyIndex).toBe(2);
  });

  it("trims oldest entries when history exceeds maxSnapshots", () => {
    const history = [1, 2, 3, 4, 5, 6, 7];
    const result = clampHistory(history, 6, 5);
    expect(result.history).toEqual([3, 4, 5, 6, 7]);
    expect(result.historyIndex).toBe(4);
  });

  it("clamps historyIndex to 0 minimum", () => {
    const history = [1, 2, 3, 4, 5, 6];
    const result = clampHistory(history, 0, 5);
    expect(result.history).toEqual([2, 3, 4, 5, 6]);
    expect(result.historyIndex).toBe(0);
  });

  it("defaults maxSnapshots to 5", () => {
    const history = [1, 2, 3, 4, 5, 6];
    const result = clampHistory(history, 5);
    expect(result.history.length).toBe(5);
  });
});

describe("createSnapshot", () => {
  it("appends a deep clone to history and clamps", () => {
    const project = makeProject();
    const state = makeState({ history: [makeProject()], historyIndex: 0 });
    const result = createSnapshot(state, project);
    expect(result.history.length).toBe(2);
    expect(result.historyIndex).toBe(1);
    // The snapshot is a deep clone, not the same reference.
    expect(result.history[1]).toEqual(project);
    expect(result.history[1]).not.toBe(project);
  });

  it("truncates future history when historyIndex is not at tip", () => {
    const v1 = makeProject({ name: "v1" });
    const v2 = makeProject({ name: "v2" });
    const v3 = makeProject({ name: "v3" });
    const state = makeState({ history: [v1, v2, v3], historyIndex: 0 });
    const newProject = makeProject({ name: "branch" });
    const result = createSnapshot(state, newProject);
    // Should have sliced history to [v1] then appended branch => [v1, branch]
    expect(result.history.length).toBe(2);
    expect(result.history[0]).toEqual(v1);
    expect(result.history[1]).toEqual(newProject);
    expect(result.historyIndex).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// Reducer action tests
// ---------------------------------------------------------------------------

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

    it("defaults to empty projects and null currentProjectId when payload is missing", () => {
      const next = reducer(initialState, {
        type: "LOAD_PROJECT_INDEX",
        payload: {},
      });
      expect(next.projects).toEqual({});
      expect(next.currentProjectId).toBeNull();
    });
  });

  describe("SET_CURRENT_PROJECT", () => {
    it("normalizes project and history, resets isDirty", () => {
      const project = makeProject();
      const state = makeState({ isDirty: true });
      const next = reducer(state, {
        type: "SET_CURRENT_PROJECT",
        payload: {
          projectId: "p1",
          projectData: { current: project, history: [project], historyIndex: 0 },
        },
      });
      expect(next.currentProjectId).toBe("p1");
      expect(next.currentProject).not.toBeNull();
      // normalizeProject adds fields; just verify the id is preserved.
      expect(next.currentProject.id).toBe("p1");
      expect(next.isDirty).toBe(false);
      expect(next.historyIndex).toBe(0);
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

    it("returns state with unchanged project when artifact not found", () => {
      const project = makeProject();
      const state = makeState({
        currentProject: project,
        history: [project],
        historyIndex: 0,
      });
      const next = reducer(state, {
        type: "UPDATE_ARTIFACT",
        payload: { phaseId: 1, artifactId: "missing", changes: { rationale: "x" } },
      });
      // updateArtifactInProject returns the same project reference when artifact not found,
      // but createSnapshot still creates a new snapshot (clone). Still, the project data
      // should be structurally unchanged.
      expect(next.currentProject).toEqual(project);
    });
  });

  describe("SET_ARTIFACT_WAIVER", () => {
    it("sets waiver on artifact and records audit event", () => {
      const project = makeProject();
      const state = makeState({
        currentProject: project,
        history: [project],
        historyIndex: 0,
      });
      const waiver = { waived: true, rationale: "Valid waiver rationale with enough characters." };
      const next = reducer(state, {
        type: "SET_ARTIFACT_WAIVER",
        payload: { phaseId: 1, artifactId: "a1", waiver, actorId: "user-1" },
      });
      expect(next.currentProject.phases[0].artifacts[0].waiver).toEqual(waiver);
      expect(next.currentProject.audit_log.length).toBe(1);
      expect(next.currentProject.audit_log[0].type).toBe("WAIVER_APPLIED");
      expect(next.isDirty).toBe(true);
    });

    it("returns state unchanged when no current project", () => {
      const next = reducer(initialState, {
        type: "SET_ARTIFACT_WAIVER",
        payload: { phaseId: 1, artifactId: "a1", waiver: { waived: true } },
      });
      expect(next).toBe(initialState);
    });
  });

  describe("SET_GATE_DECISION", () => {
    it("sets gate decision on phase", () => {
      const project = makeProject();
      const state = makeState({
        currentProject: project,
        history: [project],
        historyIndex: 0,
      });
      const decision = { decision: "GO", decidedBy: "user-1", decidedAt: "2025-01-01T00:00:00Z" };
      const next = reducer(state, {
        type: "SET_GATE_DECISION",
        payload: { phaseId: 1, decision },
      });
      expect(next.currentProject.phases[0].goNoGoDecision).toEqual(decision);
      expect(next.isDirty).toBe(true);
    });

    it("returns state unchanged when no current project", () => {
      const next = reducer(initialState, {
        type: "SET_GATE_DECISION",
        payload: { phaseId: 1, decision: { decision: "GO" } },
      });
      expect(next).toBe(initialState);
    });
  });

  describe("SAVE_SNAPSHOT", () => {
    it("creates a snapshot when current project differs from tip", () => {
      const v1 = makeProject({ name: "v1" });
      const v2 = makeProject({ name: "v2" });
      const state = makeState({
        currentProject: v2,
        history: [v1],
        historyIndex: 0,
      });
      const next = reducer(state, { type: "SAVE_SNAPSHOT" });
      expect(next.history.length).toBe(2);
      expect(next.historyIndex).toBe(1);
    });

    it("returns state unchanged when current project matches tip", () => {
      const project = makeProject();
      const clone = cloneProject(project);
      const state = makeState({
        currentProject: project,
        history: [clone],
        historyIndex: 0,
      });
      const next = reducer(state, { type: "SAVE_SNAPSHOT" });
      expect(next).toBe(state);
    });

    it("returns state unchanged when no current project", () => {
      const next = reducer(initialState, { type: "SAVE_SNAPSHOT" });
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
      expect(next.isDirty).toBe(false);
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
      expect(next.isDirty).toBe(false);
    });

    it("undo at index 0 returns state unchanged", () => {
      const state = makeState({ historyIndex: 0, history: [makeProject()] });
      expect(reducer(state, { type: "UNDO" })).toBe(state);
    });

    it("redo at end of history returns state unchanged", () => {
      const state = makeState({ historyIndex: 0, history: [makeProject()] });
      expect(reducer(state, { type: "REDO" })).toBe(state);
    });

    it("undo produces a deep clone, not the same reference as history entry", () => {
      const v1 = makeProject({ name: "v1" });
      const v2 = makeProject({ name: "v2" });
      const state = makeState({
        currentProject: v2,
        history: [v1, v2],
        historyIndex: 1,
      });
      const next = reducer(state, { type: "UNDO" });
      expect(next.currentProject).not.toBe(state.history[0]);
      expect(next.currentProject).toEqual(v1);
    });
  });

  describe("CREATE_PROJECT", () => {
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
      // normalizeProject transforms the project; just verify it is set.
      expect(next.currentProject).not.toBeNull();
      expect(next.currentProject.id).toBe("p1");
      expect(next.isDirty).toBe(false);
      expect(next.historyIndex).toBe(-1);
    });

    it("returns state unchanged when projectId is missing", () => {
      const next = reducer(initialState, {
        type: "CREATE_PROJECT",
        payload: { projectSummary: { id: "p1" } },
      });
      expect(next).toBe(initialState);
    });
  });

  describe("DELETE_PROJECT", () => {
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
      expect(next.history).toEqual([]);
      expect(next.historyIndex).toBe(-1);
      expect(next.isDirty).toBe(false);
    });

    it("deletes a non-current project without affecting current state", () => {
      const state = makeState({
        projects: { p1: { id: "p1" }, p2: { id: "p2" } },
        currentProjectId: "p1",
        currentProject: makeProject(),
        history: [makeProject()],
        historyIndex: 0,
        isDirty: true,
      });
      const next = reducer(state, { type: "DELETE_PROJECT", payload: { projectId: "p2" } });
      expect(next.projects.p2).toBeUndefined();
      expect(next.projects.p1).toBeDefined();
      expect(next.currentProjectId).toBe("p1");
      expect(next.currentProject).toBe(state.currentProject);
      expect(next.isDirty).toBe(true);
    });

    it("returns state unchanged when projectId is missing", () => {
      const next = reducer(initialState, { type: "DELETE_PROJECT", payload: {} });
      expect(next).toBe(initialState);
    });
  });

  describe("IMPORT_PROJECT", () => {
    it("adds project to projects map without changing current", () => {
      const next = reducer(initialState, {
        type: "IMPORT_PROJECT",
        payload: { projectId: "p2", projectSummary: { id: "p2", name: "Imported" } },
      });
      expect(next.projects.p2).toEqual({ id: "p2", name: "Imported" });
      expect(next.currentProjectId).toBeNull();
    });

    it("returns state unchanged when projectId is missing", () => {
      const next = reducer(initialState, {
        type: "IMPORT_PROJECT",
        payload: { projectSummary: { id: "p2" } },
      });
      expect(next).toBe(initialState);
    });
  });

  describe("UPDATE_SETTINGS", () => {
    it("merges settings", () => {
      const state = makeState({ settings: { deviceId: "d1" } });
      const next = reducer(state, {
        type: "UPDATE_SETTINGS",
        payload: { theme: "dark" },
      });
      expect(next.settings).toEqual({ deviceId: "d1", theme: "dark" });
    });

    it("does not remove existing keys when payload is empty", () => {
      const state = makeState({ settings: { deviceId: "d1" } });
      const next = reducer(state, {
        type: "UPDATE_SETTINGS",
        payload: {},
      });
      expect(next.settings).toEqual({ deviceId: "d1" });
    });
  });

  describe("MARK_CLEAN / MARK_DIRTY", () => {
    it("MARK_DIRTY sets isDirty to true", () => {
      const dirty = reducer(initialState, { type: "MARK_DIRTY" });
      expect(dirty.isDirty).toBe(true);
    });

    it("MARK_CLEAN sets isDirty to false", () => {
      const dirty = makeState({ isDirty: true });
      const clean = reducer(dirty, { type: "MARK_CLEAN" });
      expect(clean.isDirty).toBe(false);
    });

    it("toggles isDirty flag round-trip", () => {
      const dirty = reducer(initialState, { type: "MARK_DIRTY" });
      expect(dirty.isDirty).toBe(true);
      const clean = reducer(dirty, { type: "MARK_CLEAN" });
      expect(clean.isDirty).toBe(false);
    });
  });

  describe("history clamping", () => {
    it("caps history at 5 snapshots after repeated updates", () => {
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

  describe("default", () => {
    it("returns state for unknown action types", () => {
      const state = makeState();
      expect(reducer(state, { type: "UNKNOWN_ACTION" })).toBe(state);
    });
  });
});

describe("createSnapshot with integrity guard", () => {
  it("skips snapshot if project has duplicate artifact IDs", () => {
    const corruptProject = {
      id: "corrupt",
      name: "Bad",
      phases: [
        { id: 1, artifacts: [{ id: "dup" }, { id: "dup" }] },
      ],
    };
    const state = makeState({ history: [], historyIndex: -1 });
    const result = createSnapshot(state, corruptProject);
    // Should return clamped history unchanged (no snapshot created)
    expect(result.history.length).toBe(0);
  });

  it("creates snapshot for valid project", () => {
    const project = makeProject();
    const state = makeState({ history: [], historyIndex: -1 });
    const result = createSnapshot(state, project);
    expect(result.history.length).toBe(1);
  });
});
