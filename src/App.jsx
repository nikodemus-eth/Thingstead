import { useEffect, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { ProjectProvider, useProject } from "./contexts/ProjectContext.jsx";
import ProjectList from "./components/ProjectList.jsx";
import PhaseNav from "./components/PhaseNav.jsx";
import PhaseDetail from "./components/PhaseDetail.jsx";
import Search from "./components/Search.jsx";
import Dashboard from "./components/Dashboard.jsx";
import GlyphIcon from "./components/GlyphIcon.jsx";
import LanStatus from "./components/LanStatus.jsx";
import styles from "./App.module.css";

function AppShell() {
  const { state, autoSave, dispatch } = useProject();
  const projectKey = state.currentProjectId || "no-project";

  return (
    <AppSession
      key={projectKey}
      state={state}
      autoSave={autoSave}
      dispatch={dispatch}
    />
  );
}

function formatSavedAtLabel(isoString) {
  const savedDate = new Date(isoString);
  return `Saved at ${savedDate.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function AppSession({ state, autoSave, dispatch }) {
  const [currentPhaseId, setCurrentPhaseId] = useState(1);
  const [highlightedArtifactId, setHighlightedArtifactId] = useState(null);
  const [currentView, setCurrentView] = useState("project");
  const [focusModeEnabled, setFocusModeEnabled] = useState(false);

  const projectPhaseIds = (state.currentProject?.phases || []).map((p) => p.id);
  const effectivePhaseId =
    state.currentProject && projectPhaseIds.includes(currentPhaseId)
      ? currentPhaseId
      : 1;

  const handleSelectSearchResult = (result) => {
    setCurrentPhaseId(result.phaseId);
    setHighlightedArtifactId(result.artifactId || null);
    setCurrentView("project");
  };

  const autoSaveLabel = autoSave?.isSaving
    ? "Saving..."
    : autoSave?.lastSaved
      ? formatSavedAtLabel(autoSave.lastSaved)
      : "Idle";

  const canUndo = state.historyIndex > 0;
  const canRedo = state.historyIndex < state.history.length - 1;

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);
      if (isInput) return;

      // Global modal escape: close the topmost app modal without requiring each component
      // to wire its own Escape handler (useful for e2e stability and accessibility).
      if (event.key === "Escape" || event.key === "Esc") {
        const dialog = document.querySelector('[role="dialog"][aria-modal="true"]');
        if (dialog) {
          const buttons = Array.from(dialog.querySelectorAll("button"));
          const closeBtn = buttons.find((b) =>
            /^(close|cancel)/i.test((b.textContent || "").trim())
          );
          if (closeBtn) {
            event.preventDefault();
            closeBtn.click();
            return;
          }
        }
      }

      const isMeta = event.metaKey || event.ctrlKey;
      if (!isMeta) return;

      if (event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        if (canRedo) {
          dispatch({ type: "REDO" });
        }
        return;
      }

      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (canUndo) {
          dispatch({ type: "UNDO" });
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, canRedo, dispatch]);

  const fadeUp = {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: "easeOut" },
  };

  return (
    <div
      className={`${styles.app} ${
        focusModeEnabled && currentView === "project" ? styles.focusMode : ""
      }`}
    >
      <Motion.aside className={styles.sidebar} {...fadeUp}>
        <div className={styles.nav}>
          <button
            type="button"
            onClick={() => setCurrentView("dashboard")}
            className={
              currentView === "dashboard"
                ? styles.navButtonActive
                : styles.navButton
            }
          >
            <span className={styles.navButtonContent}>
              <GlyphIcon name="audit" size={14} />
              Dashboard
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentView("project")}
            className={
              currentView === "project"
                ? styles.navButtonActive
                : styles.navButton
            }
          >
            <span className={styles.navButtonContent}>
              <GlyphIcon name="project" size={14} />
              Project
            </span>
          </button>
        </div>
        <ProjectList />
      </Motion.aside>
      <Motion.main
        className={styles.main}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.04 }}
      >
        <Motion.header
          className={styles.header}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, ease: "easeOut", delay: 0.1 }}
        >
          <div className={styles.headerTitleWrap}>
            <div className={styles.headerTitle}>Thingstead</div>
            {state.currentProject && (
              <div className={styles.modeBadge}>
                {state.currentProject.governance_mode === "solo"
                  ? "Single-Actor Governance"
                  : "Team Governance"}
              </div>
            )}
          </div>
          <div className={styles.headerControls}>
            <div className={styles.undoRedo}>
              <button
                type="button"
                onClick={() => dispatch({ type: "UNDO" })}
                disabled={!canUndo}
                className={styles.actionButton}
              >
                Undo
              </button>
              <button
                type="button"
                onClick={() => dispatch({ type: "REDO" })}
                disabled={!canRedo}
                className={styles.actionButton}
              >
                Redo
              </button>
            </div>
            <div className={styles.shortcuts}>
              Ctrl/Cmd+Z • Ctrl/Cmd+Shift+Z
            </div>
            <div className={styles.headerStatus}>
              <span>{autoSaveLabel}</span>
              <LanStatus />
            </div>
            {state.currentProject && currentView === "project" && (
              <button
                type="button"
                onClick={() => setFocusModeEnabled((value) => !value)}
                className={
                  focusModeEnabled ? styles.focusToggleActive : styles.focusToggle
                }
              >
                <GlyphIcon name={focusModeEnabled ? "lock" : "guided"} size={12} />
                {focusModeEnabled ? "Exit Focus Mode" : "Focus Mode"}
              </button>
            )}
          </div>
          <div
            className={
              focusModeEnabled && currentView === "project"
                ? styles.headerSearchHidden
                : styles.headerSearch
            }
          >
            <Search onSelectResult={handleSelectSearchResult} />
          </div>
        </Motion.header>

        {autoSave?.quotaExceeded && (
          <div className={styles.warning}>
            Storage quota exceeded. Auto-save disabled. Please export your
            project.
          </div>
        )}

        <AnimatePresence mode="wait">
          {currentView === "dashboard" ? (
            <Motion.div
              key="dashboard-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <Dashboard />
            </Motion.div>
          ) : (
            <Motion.div
              key="project-view"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              {!focusModeEnabled && (
                <PhaseNav
                  currentPhaseId={effectivePhaseId}
                  onSelectPhase={setCurrentPhaseId}
                />
              )}
              <PhaseDetail
                currentPhaseId={effectivePhaseId}
                highlightedArtifactId={highlightedArtifactId}
              />
            </Motion.div>
          )}
        </AnimatePresence>
      </Motion.main>
    </div>
  );
}

export default function App() {
  return (
    <ProjectProvider>
      <AppShell />
    </ProjectProvider>
  );
}
