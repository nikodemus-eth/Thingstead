import { useEffect, useMemo, useState } from "react";
import { motion as Motion } from "framer-motion";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { useProject } from "../contexts/ProjectContext.jsx";
import { saveSettings } from "../utils/storage.js";
import ProjectSummary from "./widgets/ProjectSummary.jsx";
import PhaseStatus from "./widgets/PhaseStatus.jsx";
import RecentActivity from "./widgets/RecentActivity.jsx";
import GateOverview from "./widgets/GateOverview.jsx";
import BlockedArtifacts from "./widgets/BlockedArtifacts.jsx";
import GlyphIcon from "./GlyphIcon.jsx";
import styles from "./Dashboard.module.css";

const WIDGETS = {
  ProjectSummary: {
    title: "Project Summary",
    icon: "report",
    component: ProjectSummary,
  },
  PhaseStatus: {
    title: "Phase Status",
    icon: "phase",
    component: PhaseStatus,
  },
  RecentActivity: {
    title: "Recent Activity",
    icon: "modify",
    component: RecentActivity,
  },
  GateOverview: {
    title: "Gate Overview",
    icon: "gate",
    component: GateOverview,
  },
  BlockedArtifacts: {
    title: "Blocked Artifacts",
    icon: "warning",
    component: BlockedArtifacts,
  },
};

const DEFAULT_LAYOUT = [
  { i: "ProjectSummary", x: 0, y: 0, w: 4, h: 4 },
  { i: "PhaseStatus", x: 4, y: 0, w: 8, h: 6 },
  { i: "RecentActivity", x: 0, y: 4, w: 4, h: 6 },
  { i: "GateOverview", x: 4, y: 6, w: 4, h: 5 },
  { i: "BlockedArtifacts", x: 8, y: 6, w: 4, h: 5 },
];

function sanitizeLayout(layout) {
  const validKeys = new Set(Object.keys(WIDGETS));
  return layout.filter((item) => validKeys.has(item.i));
}

export default function Dashboard() {
  const { state, dispatch } = useProject();
  const [showManager, setShowManager] = useState(false);
  const [gridWidth, setGridWidth] = useState(
    Math.max(320, window.innerWidth - 340)
  );

  const layout = useMemo(() => {
    const savedLayout = state.settings?.dashboard?.layout;
    if (Array.isArray(savedLayout)) return sanitizeLayout(savedLayout);
    return DEFAULT_LAYOUT;
  }, [state.settings?.dashboard?.layout]);

  const hiddenWidgets = useMemo(() => {
    const savedHidden = state.settings?.dashboard?.hiddenWidgets;
    if (Array.isArray(savedHidden)) return savedHidden;
    return [];
  }, [state.settings?.dashboard?.hiddenWidgets]);

  useEffect(() => {
    const handleResize = () => {
      setGridWidth(Math.max(320, window.innerWidth - 340));
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const visibleLayout = useMemo(() => {
    return layout.filter((item) => !hiddenWidgets.includes(item.i));
  }, [layout, hiddenWidgets]);

  const persistSettings = (nextLayout, nextHidden) => {
    const updated = {
      ...state.settings,
      dashboard: {
        layout: nextLayout,
        hiddenWidgets: nextHidden,
      },
    };
    saveSettings(updated);
    dispatch({ type: "UPDATE_SETTINGS", payload: updated });
  };

  const mergeLayoutWithHidden = (nextLayout) => {
    const hiddenItems = layout.filter((item) => hiddenWidgets.includes(item.i));
    const merged = nextLayout.concat(hiddenItems);
    return sanitizeLayout(merged);
  };

  const handleLayoutChange = (nextLayout) => {
    const merged = mergeLayoutWithHidden(nextLayout);
    persistSettings(merged, hiddenWidgets);
  };

  const toggleWidget = (widgetId) => {
    const nextHidden = hiddenWidgets.includes(widgetId)
      ? hiddenWidgets.filter((id) => id !== widgetId)
      : hiddenWidgets.concat(widgetId);
    persistSettings(layout, nextHidden);
  };

  const resetLayout = () => {
    persistSettings(DEFAULT_LAYOUT, []);
  };

  const project = state.currentProject;

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <button
          type="button"
          className={styles.controlButton}
          onClick={() => setShowManager((prev) => !prev)}
        >
          <GlyphIcon name={showManager ? "x" : "guided"} size={12} />
          {showManager ? "Close Widgets" : "Add/Remove Widgets"}
        </button>
        <button
          type="button"
          className={styles.controlButton}
          onClick={resetLayout}
        >
          <GlyphIcon name="direct" size={12} />
          Reset Layout
        </button>
      </div>

      {showManager && (
        <div className={styles.widgetManager}>
          {Object.entries(WIDGETS).map(([id, widget]) => (
            <label key={id} className={styles.widgetToggle}>
              <input
                type="checkbox"
                checked={!hiddenWidgets.includes(id)}
                onChange={() => toggleWidget(id)}
              />
              <GlyphIcon name={widget.icon} size={12} />
              {widget.title}
            </label>
          ))}
        </div>
      )}

      <GridLayout
        className={styles.grid}
        layout={visibleLayout}
        width={gridWidth}
        cols={12}
        rowHeight={30}
        margin={[16, 16]}
        onLayoutChange={handleLayoutChange}
        // Use a stable selector for drag handles (CSS modules hashes are not stable across builds).
        draggableHandle='[data-widget-handle]'
      >
        {visibleLayout.map((item) => {
          const widget = WIDGETS[item.i];
          if (!widget) return null;
          const WidgetComponent = widget.component;
          return (
            <Motion.div
              key={item.i}
              className={styles.widgetCard}
              data-widget-id={item.i}
              /*
                react-grid-layout positions items via CSS transforms during drag and layout.
                Avoid motion-driven transforms (e.g. y) here, or dragging can appear "stuck"
                because transforms from framer-motion and react-grid-layout compete.
              */
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <div className={styles.widgetHeader} data-widget-handle={item.i}>
                <span className={styles.headerTitle}>
                  <GlyphIcon name={widget.icon} size={14} />
                  {widget.title}
                </span>
                <button
                  type="button"
                  className={styles.widgetSettings}
                  onClick={() => toggleWidget(item.i)}
                >
                  <GlyphIcon name="remove" size={12} />
                </button>
              </div>
              <WidgetComponent project={project} />
            </Motion.div>
          );
        })}
      </GridLayout>
    </div>
  );
}
