import styles from "../Dashboard.module.css";
import { getGovernanceDepth, getGovernanceDepthLabel } from "../../utils/governanceDepth.js";
import GlyphIcon from "../GlyphIcon.jsx";
import { isArtifactComplete } from "../../utils/artifactState.js";

function phaseCompletion(phase) {
  const artifacts = phase.artifacts || [];
  if (artifacts.length === 0) return 0;
  const completed = artifacts.filter((artifact) => isArtifactComplete(artifact, phase.id)).length;
  return Math.round((completed / artifacts.length) * 100);
}

export default function PhaseStatus({ project }) {
  if (!project) return null;

  return (
    <div className={styles.widgetBody}>
      {project.phases.map((phase) => {
        const percent = phaseCompletion(phase);
        const depth = getGovernanceDepthLabel(getGovernanceDepth(phase));
        return (
          <div key={phase.id} className={styles.progressRow}>
            <div className={styles.progressLabelWrap}>
              <div className={styles.progressLabel}>
                <GlyphIcon name="phase" size={12} />
                Phase {phase.id}
              </div>
              <div className={styles.progressMeta}>{depth}</div>
            </div>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressFill}
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className={styles.progressValue}>{percent}%</div>
          </div>
        );
      })}
    </div>
  );
}
