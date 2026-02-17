import { isGateReady } from "../../utils/gateLogic.js";
import styles from "../Dashboard.module.css";
import GlyphIcon from "../GlyphIcon.jsx";

function gateStatus(phase) {
  if (!isGateReady(phase)) return "locked";
  const status = phase.goNoGoDecision?.status;
  if (status === "go" || status === "no-go") return status;
  return "ready";
}

function gateGlyph(status) {
  if (status === "locked") return "lock";
  if (status === "go") return "check";
  if (status === "no-go") return "x";
  return "pending";
}

export default function GateOverview({ project }) {
  if (!project) return null;

  return (
    <div className={styles.widgetBody}>
      {project.phases.map((phase) => (
        <div key={phase.id} className={styles.gateRow}>
          <div className={styles.gateLabel}>
            <GlyphIcon name="phase" size={12} />
            Phase {phase.id}
          </div>
          <span className={`${styles.badge} ${styles[`badge${gateStatus(phase)}`]}`}>
            <GlyphIcon name={gateGlyph(gateStatus(phase))} size={10} />
            {gateStatus(phase)}
          </span>
        </div>
      ))}
    </div>
  );
}
