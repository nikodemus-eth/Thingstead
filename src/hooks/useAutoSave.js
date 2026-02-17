import { useEffect, useRef, useState } from "react";
import { saveProject } from "../utils/storage.js";
import { upsertRemoteProject } from "../utils/lanSync.js";

const AUTO_SAVE_DELAY_MS = 2000;

export function useAutoSave(state, dispatch) {
  const [isSaving, setIsSaving] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [lastSaved, setLastSaved] = useState(
    state.currentProject?.lastModified || null
  );
  const timerRef = useRef(null);

  useEffect(() => {
    if (state.currentProject?.lastModified) {
      setLastSaved(state.currentProject.lastModified);
    }
  }, [state.currentProject?.id, state.currentProject?.lastModified]);

  useEffect(() => {
    if (quotaExceeded) return undefined;
    if (!state.isDirty) return undefined;
    if (!state.currentProjectId || !state.currentProject) return undefined;

    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(() => {
      setIsSaving(true);
      try {
        const projectData = {
          current: state.currentProject,
          history: state.history,
          historyIndex: state.historyIndex,
        };
        const result = saveProject(state.currentProjectId, projectData);
        if (!result) {
          setQuotaExceeded(true);
          return;
        }
        // Best-effort LAN sync; local save remains source of truth for this browser.
        upsertRemoteProject(state.currentProject).catch(() => {});
        dispatch({ type: "SAVE_SNAPSHOT" });
        dispatch({ type: "MARK_CLEAN" });
        setLastSaved(new Date().toISOString());
      } catch {
        setQuotaExceeded(true);
      } finally {
        setIsSaving(false);
      }
    }, AUTO_SAVE_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [
    state.isDirty,
    state.currentProjectId,
    state.currentProject,
    state.history,
    state.historyIndex,
    quotaExceeded,
    dispatch,
  ]);

  return { isSaving, quotaExceeded, lastSaved };
}
