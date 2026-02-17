import React, { createContext, useContext, useEffect, useReducer } from "react";
import {
  loadProjectIndex,
  loadProject,
  loadSettings,
  saveProjectIndex,
  saveProject,
  saveSettings,
} from "../utils/storage.js";
import { useAutoSave } from "../hooks/useAutoSave.js";
import { fetchRemoteIndex, fetchRemoteProject } from "../utils/lanSync.js";
import { randomUUID } from "../utils/uuid.js";
import { reducer, initialState } from "../state/projectReducer.js";

const ProjectContext = createContext(null);

export function ProjectProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const autoSave = useAutoSave(state, dispatch);

  useEffect(() => {
    const index = loadProjectIndex();
    if (index) {
      dispatch({ type: "LOAD_PROJECT_INDEX", payload: index });
      if (index.currentProjectId) {
        const projectData = loadProject(index.currentProjectId);
        if (projectData) {
          dispatch({
            type: "SET_CURRENT_PROJECT",
            payload: {
              projectId: index.currentProjectId,
              projectData,
            },
          });
        }
      }
    }

    // Best-effort LAN sync: pull index from backend (if available) and seed local cache.
    // This enables other machines on the LAN to see projects without manual import/export.
    const syncFromServer = () =>
      fetchRemoteIndex()
        .then(async (remoteIndex) => {
        if (!remoteIndex?.projects) return;
        saveProjectIndex(remoteIndex);
        dispatch({ type: "LOAD_PROJECT_INDEX", payload: remoteIndex });

        const remoteCurrentId = remoteIndex.currentProjectId;
        if (remoteCurrentId) {
          const existing = loadProject(remoteCurrentId);
          if (!existing) {
            const remoteProject = await fetchRemoteProject(remoteCurrentId);
            if (remoteProject) {
              const projectData = { current: remoteProject, history: [], historyIndex: -1 };
              saveProject(remoteCurrentId, projectData);
              dispatch({
                type: "SET_CURRENT_PROJECT",
                payload: { projectId: remoteCurrentId, projectData },
              });
            }
          }
        }
      })
      .catch(() => {});

    // Initial sync and then refresh whenever the tab regains focus.
    syncFromServer();
    const onFocus = () => syncFromServer();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  useEffect(() => {
    const settings = loadSettings() || {};
    const nextSettings = { ...settings };

    // Device identity is required for consistent audit fields and LAN sync attribution.
    // Ensure it exists deterministically at startup.
    if (typeof nextSettings.deviceId !== "string" || nextSettings.deviceId.trim() === "") {
      nextSettings.deviceId = randomUUID();
      saveSettings(nextSettings);
    }

    dispatch({ type: "UPDATE_SETTINGS", payload: nextSettings });
  }, []);

  return (
    <ProjectContext.Provider value={{ state, dispatch, autoSave }}>
      {children}
    </ProjectContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error("useProject must be used within a ProjectProvider");
  }
  return context;
}
