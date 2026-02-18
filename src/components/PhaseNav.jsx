import { useCallback, useMemo, useRef } from "react";
import { motion as Motion } from "framer-motion";
import { useProject } from "../contexts/ProjectContext.jsx";
import { isGateReady } from "../utils/gateLogic.js";
import { isArtifactComplete, isArtifactWaived } from "../utils/artifactState.js";
import GlyphIcon from "./GlyphIcon.jsx";
import styles from "./PhaseNav.module.css";

const EMPTY_PHASES = [];

function phaseMetrics(phase) {
  const artifacts = phase?.artifacts || [];
  const total = artifacts.length;
  const completed = artifacts.filter((a) => isArtifactComplete(a, phase.id)).length;
  const waivers = artifacts.filter((a) => isArtifactWaived(a)).length;
  const gateBlockingRemaining = artifacts.filter(
    (a) => a.isGateBlocking && !isArtifactWaived(a) && !isArtifactComplete(a, phase.id)
  ).length;
  const gateReady = isGateReady(phase);
  const decided = phase?.goNoGoDecision?.status === "go" || phase?.goNoGoDecision?.status === "no-go";
  return { total, completed, waivers, gateBlockingRemaining, gateReady, decided };
}

export default function PhaseNav({ currentPhaseId, onSelectPhase }) {
  const { state } = useProject();
  const navRef = useRef(null);

  const phases = useMemo(() => {
    return state.currentProject?.phases || EMPTY_PHASES;
  }, [state.currentProject?.phases]);

  const earliestNoGo = useMemo(() => {
    const noGoPhases = phases
      .filter((phase) => phase.goNoGoDecision?.status === "no-go")
      .map((phase) => phase.id);
    if (noGoPhases.length === 0) return null;
    return Math.min(...noGoPhases);
  }, [phases]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      if (phases.length === 0) return;

      const currentIndex = phases.findIndex((p) => p.id === currentPhaseId);
      if (currentIndex === -1) return;

      event.preventDefault();

      const nextIndex =
        event.key === "ArrowRight"
          ? Math.min(currentIndex + 1, phases.length - 1)
          : Math.max(currentIndex - 1, 0);

      if (nextIndex === currentIndex) return;

      const nextPhase = phases[nextIndex];
      onSelectPhase(nextPhase.id);

      // Move DOM focus to the newly selected button.
      const buttons = navRef.current?.querySelectorAll("button[data-phase-id]");
      if (buttons) {
        const target = Array.from(buttons).find(
          (b) => b.dataset.phaseId === String(nextPhase.id)
        );
        target?.focus();
      }
    },
    [phases, currentPhaseId, onSelectPhase]
  );

  return (
    <section className={styles.container}>
      <div className={styles.title}>
        <GlyphIcon name="phase" size={16} />
        Phases
      </div>
      {earliestNoGo && currentPhaseId > earliestNoGo && (
        <div className={styles.warning}>
          Warning: You are editing a later phase after a No-Go decision in an
          earlier phase.
        </div>
      )}
      <Motion.div
        ref={navRef}
        className={styles.nav}
        role="tablist"
        aria-label="Project phases"
        onKeyDown={handleKeyDown}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        {phases.map((phase) => {
          const metrics = phaseMetrics(phase);
          const isActive = phase.id === currentPhaseId;
          return (
            <Motion.button
              key={phase.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              data-phase-id={phase.id}
              tabIndex={isActive ? 0 : -1}
              onClick={() => onSelectPhase(phase.id)}
              className={isActive ? styles.activeButton : styles.button}
            >
              <span className={styles.phaseMeta}>
                <span className={styles.phaseNumber}>
                  <GlyphIcon name="phase" size={13} />
                  Phase {phase.id}
                </span>
                <span className={styles.phaseName}>
                  {phase.name || "Unnamed Phase"}
                </span>
              </span>
              <span className={styles.metrics}>
                <span className={styles.metricChip} aria-label="Completion ratio">
                  <GlyphIcon name="check" size={12} />
                  {metrics.completed}/{metrics.total}
                </span>
                <span
                  className={styles.metricChip}
                  aria-label="Gate-blocking remaining"
                  title="Gate-blocking artifacts remaining"
                >
                  <GlyphIcon name={metrics.gateReady ? "gate" : "lock"} size={12} />
                  {metrics.gateBlockingRemaining}
                </span>
                <span
                  className={styles.metricChip}
                  aria-label="Waiver count"
                  title="Waivers in this phase"
                >
                  <GlyphIcon name="waiver" size={12} />
                  {metrics.waivers}
                </span>
                {metrics.decided && (
                  <span className={styles.metricChip} aria-label="Decision made">
                    <GlyphIcon name="audit" size={12} />
                    Decided
                  </span>
                )}
              </span>
            </Motion.button>
          );
        })}
      </Motion.div>
    </section>
  );
}
