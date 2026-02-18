import { normalizeProject } from "../utils/normalizeProject.js";
import { randomUUID } from "../utils/uuid.js";
import { verifyProjectIntegrity } from "../utils/projectIntegrity.js";

export const initialState = {
  projects: {},
  currentProjectId: null,
  currentProject: null,
  history: [],
  historyIndex: -1,
  isDirty: false,
  settings: {},
};

export function cloneProject(project) {
  return JSON.parse(JSON.stringify(project));
}

export function updateArtifactInProject(project, phaseId, artifactId, changes) {
  const phases = project?.phases || [];
  const phaseIndex = phases.findIndex((p) => p.id === phaseId);
  if (phaseIndex === -1) return project;

  const phase = phases[phaseIndex];
  const artifacts = phase.artifacts || [];
  const artifactIndex = artifacts.findIndex((a) => a.id === artifactId);
  if (artifactIndex === -1) return project;

  const previousArtifact = artifacts[artifactIndex];
  const mergedArtifact = { ...previousArtifact, ...changes };
  const updatedArtifact = mergedArtifact;
  const updatedArtifacts = artifacts.slice();
  updatedArtifacts[artifactIndex] = updatedArtifact;

  const updatedPhase = { ...phase, artifacts: updatedArtifacts };
  const updatedPhases = phases.slice();
  updatedPhases[phaseIndex] = updatedPhase;

  return { ...project, phases: updatedPhases };
}

export function updateArtifactWaiverInProject(project, phaseId, artifactId, waiver, actorId) {
  const phases = project?.phases || [];
  const phaseIndex = phases.findIndex((p) => p.id === phaseId);
  if (phaseIndex === -1) return project;

  const phase = phases[phaseIndex];
  const artifacts = phase.artifacts || [];
  const artifactIndex = artifacts.findIndex((a) => a.id === artifactId);
  if (artifactIndex === -1) return project;

  const previousArtifact = artifacts[artifactIndex];
  const nextArtifact = { ...previousArtifact, waiver: waiver || null, lastModified: new Date().toISOString() };

  const updatedArtifacts = artifacts.slice();
  updatedArtifacts[artifactIndex] = nextArtifact;
  const updatedPhase = { ...phase, artifacts: updatedArtifacts };
  const updatedPhases = phases.slice();
  updatedPhases[phaseIndex] = updatedPhase;

  const previousWaived = Boolean(previousArtifact?.waiver?.waived);
  const nextWaived = Boolean(waiver && waiver.waived);

  const auditEvent = {
    id: randomUUID(),
    at: new Date().toISOString(),
    actor_id: actorId || "unknown",
    type: nextWaived ? "WAIVER_APPLIED" : "WAIVER_REMOVED",
    phase_id: phaseId,
    artifact_id: artifactId,
    rationale: nextWaived ? waiver?.rationale || "" : "",
  };

  const audit_log = Array.isArray(project.audit_log) ? project.audit_log.slice() : [];
  // Only record when waiver state changes or rationale changes meaningfully.
  if (previousWaived !== nextWaived || (nextWaived && previousArtifact?.waiver?.rationale !== waiver?.rationale)) {
    audit_log.push(auditEvent);
  }

  return { ...project, phases: updatedPhases, audit_log };
}

export function updateGateDecisionInProject(project, phaseId, decision) {
  const phases = project?.phases || [];
  const phaseIndex = phases.findIndex((p) => p.id === phaseId);
  if (phaseIndex === -1) return project;

  const phase = phases[phaseIndex];
  const updatedPhase = { ...phase, goNoGoDecision: { ...decision } };
  const updatedPhases = phases.slice();
  updatedPhases[phaseIndex] = updatedPhase;

  return { ...project, phases: updatedPhases };
}

export function clampHistory(history, historyIndex, maxSnapshots = 5) {
  if (history.length <= maxSnapshots) return { history, historyIndex };
  const overflow = history.length - maxSnapshots;
  return {
    history: history.slice(overflow),
    historyIndex: Math.max(historyIndex - overflow, 0),
  };
}

export function createSnapshot(state, project) {
  // Guard: don't snapshot corrupt state (duplicate IDs, etc.)
  const integrity = verifyProjectIntegrity(project);
  if (!integrity.ok) {
    console.warn("[Thingstead] Skipping snapshot: project failed integrity check", integrity.errors);
    return clampHistory(state.history, state.historyIndex);
  }
  const snapshot = cloneProject(project);
  const baseHistory = state.history.slice(0, state.historyIndex + 1);
  const nextHistory = baseHistory.concat(snapshot);
  const nextIndex = nextHistory.length - 1;
  return clampHistory(nextHistory, nextIndex);
}

export function reducer(state, action) {
  switch (action.type) {
    case "LOAD_PROJECT_INDEX": {
      const index = action.payload || {};
      return {
        ...state,
        projects: index.projects || {},
        currentProjectId: index.currentProjectId || null,
      };
    }
    case "SET_CURRENT_PROJECT": {
      const { projectId, projectData } = action.payload || {};
      const normalizedCurrent = normalizeProject(projectData?.current || null);
      const normalizedHistory = (projectData?.history || []).map((snapshot) =>
        normalizeProject(snapshot)
      );
      return {
        ...state,
        currentProjectId: projectId || null,
        currentProject: normalizedCurrent,
        history: normalizedHistory,
        historyIndex:
          typeof projectData?.historyIndex === "number"
            ? projectData.historyIndex
            : -1,
        isDirty: false,
      };
    }
    case "UPDATE_ARTIFACT": {
      const { phaseId, artifactId, changes } = action.payload || {};
      if (!state.currentProject) return state;
      const updatedProject = updateArtifactInProject(
        state.currentProject,
        phaseId,
        artifactId,
        changes || {}
      );
      const snapshot = createSnapshot(state, updatedProject);
      return {
        ...state,
        currentProject: updatedProject,
        history: snapshot.history,
        historyIndex: snapshot.historyIndex,
        isDirty: true,
      };
    }
    case "SET_ARTIFACT_WAIVER": {
      const { phaseId, artifactId, waiver, actorId } = action.payload || {};
      if (!state.currentProject) return state;
      const updatedProject = updateArtifactWaiverInProject(
        state.currentProject,
        phaseId,
        artifactId,
        waiver,
        actorId
      );
      const snapshot = createSnapshot(state, updatedProject);
      return {
        ...state,
        currentProject: updatedProject,
        history: snapshot.history,
        historyIndex: snapshot.historyIndex,
        isDirty: true,
      };
    }
    case "SET_GATE_DECISION": {
      const { phaseId, decision } = action.payload || {};
      if (!state.currentProject) return state;
      const updatedProject = updateGateDecisionInProject(
        state.currentProject,
        phaseId,
        decision || {}
      );
      const snapshot = createSnapshot(state, updatedProject);
      return {
        ...state,
        currentProject: updatedProject,
        history: snapshot.history,
        historyIndex: snapshot.historyIndex,
        isDirty: true,
      };
    }
    case "SAVE_SNAPSHOT": {
      if (!state.currentProject) return state;
      const tip = state.history[state.historyIndex];
      if (tip && JSON.stringify(tip) === JSON.stringify(state.currentProject)) {
        return state;
      }
      const clamped = createSnapshot(state, state.currentProject);
      return {
        ...state,
        history: clamped.history,
        historyIndex: clamped.historyIndex,
      };
    }
    case "UNDO": {
      if (state.historyIndex <= 0) return state;
      const nextIndex = state.historyIndex - 1;
      return {
        ...state,
        currentProject: cloneProject(state.history[nextIndex]),
        historyIndex: nextIndex,
        isDirty: false,
      };
    }
    case "REDO": {
      if (state.historyIndex >= state.history.length - 1) return state;
      const nextIndex = state.historyIndex + 1;
      return {
        ...state,
        currentProject: cloneProject(state.history[nextIndex]),
        historyIndex: nextIndex,
        isDirty: false,
      };
    }
    case "MARK_CLEAN":
      return { ...state, isDirty: false };
    case "MARK_DIRTY":
      return { ...state, isDirty: true };
    case "CREATE_PROJECT": {
      const { projectId, projectSummary, projectData } = action.payload || {};
      if (!projectId) return state;
      const normalizedCurrent = normalizeProject(projectData?.current || null);
      const normalizedHistory = (projectData?.history || []).map((snapshot) =>
        normalizeProject(snapshot)
      );
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: projectSummary || { id: projectId },
        },
        currentProjectId: projectId,
        currentProject: normalizedCurrent,
        history: normalizedHistory,
        historyIndex:
          typeof projectData?.historyIndex === "number"
            ? projectData.historyIndex
            : -1,
        isDirty: false,
      };
    }
    case "DELETE_PROJECT": {
      const { projectId } = action.payload || {};
      if (!projectId) return state;
      const nextProjects = { ...state.projects };
      delete nextProjects[projectId];
      const isCurrent = state.currentProjectId === projectId;
      return {
        ...state,
        projects: nextProjects,
        currentProjectId: isCurrent ? null : state.currentProjectId,
        currentProject: isCurrent ? null : state.currentProject,
        history: isCurrent ? [] : state.history,
        historyIndex: isCurrent ? -1 : state.historyIndex,
        isDirty: isCurrent ? false : state.isDirty,
      };
    }
    case "IMPORT_PROJECT": {
      const { projectId, projectSummary } = action.payload || {};
      if (!projectId) return state;
      return {
        ...state,
        projects: {
          ...state.projects,
          [projectId]: projectSummary || { id: projectId },
        },
      };
    }
    case "UPDATE_SETTINGS": {
      const settings = action.payload || {};
      return { ...state, settings: { ...state.settings, ...settings } };
    }
    default:
      return state;
  }
}
