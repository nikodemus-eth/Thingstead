import { useMemo } from "react";
import { motion as Motion } from "framer-motion";
import { useProject } from "../contexts/ProjectContext.jsx";
import ArtifactList from "./ArtifactList.jsx";
import GoNoGoDecision from "./GoNoGoDecision.jsx";
import styles from "./PhaseDetail.module.css";
import { isGateReady } from "../utils/gateLogic.js";
import GlyphIcon from "./GlyphIcon.jsx";

const PHASE_DESCRIPTIONS = {
  1: "Define the business problem, stakeholders, and success criteria.",
  2: "Assess data sources, quality, and initial exploration.",
  3: "Prepare and transform data for modeling.",
  4: "Select and train models with documented rationale.",
  5: "Evaluate model performance, errors, and baseline comparisons.",
  6: "Plan deployment, monitoring, and rollout safeguards.",
};

export default function PhaseDetail({ currentPhaseId, highlightedArtifactId }) {
  const { state, dispatch } = useProject();

  const phase = useMemo(() => {
    return state.currentProject?.phases?.find((p) => p.id === currentPhaseId);
  }, [state.currentProject, currentPhaseId]);

  if (!state.currentProject) {
    return (
      <div className={styles.empty}>
        Select a project to begin.
        <br />
        Projects are stored in this browser only. On another device/browser, use{" "}
        <strong>Export JSON</strong> on the source machine, then{" "}
        <strong>Import Project</strong> on this one.
      </div>
    );
  }

  if (!phase) {
    return <div className={styles.empty}>Phase not found.</div>;
  }

  const handleDecision = (decision) => {
    dispatch({
      type: "SET_GATE_DECISION",
      payload: { phaseId: phase.id, decision },
    });
  };

  const gateReady = isGateReady(phase);
  const decisionStatus = phase?.goNoGoDecision?.status || "pending";
  const gateBanner = (() => {
    if (decisionStatus === "go" || decisionStatus === "no-go") {
      return `PHASE ${phase.id} GATE: DECIDED (${decisionStatus.toUpperCase()})`;
    }
    return gateReady
      ? `PHASE ${phase.id} GATE: READY`
      : `PHASE ${phase.id} GATE: LOCKED`;
  })();

  return (
    <Motion.section
      className={styles.container}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.26, ease: "easeOut" }}
    >
      <div
        className={styles.gateBanner}
        aria-label={`Phase ${phase.id} gate status`}
      >
        <GlyphIcon
          name={
            decisionStatus === "go"
              ? "check"
              : decisionStatus === "no-go"
              ? "x"
              : gateReady
              ? "gate"
              : "lock"
          }
          size={14}
        />
        {gateBanner}
      </div>

      <Motion.div
        className={styles.header}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: "easeOut", delay: 0.04 }}
      >
        <div className={styles.title}>
          Phase {phase.id}: {phase.name}
        </div>
        <div className={styles.description}>
          {PHASE_DESCRIPTIONS[phase.id] || "Description pending."}
        </div>
      </Motion.div>

      <ArtifactList
        currentPhaseId={currentPhaseId}
        highlightedArtifactId={highlightedArtifactId}
      />

      <Motion.div
        className={styles.gate}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: "easeOut", delay: 0.08 }}
      >
        <GoNoGoDecision
          key={phase.id}
          phase={phase}
          governanceMode={state.currentProject?.governance_mode || "team"}
          onDecision={handleDecision}
        />
      </Motion.div>
    </Motion.section>
  );
}
