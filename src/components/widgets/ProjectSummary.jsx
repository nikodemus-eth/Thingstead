import styles from "../Dashboard.module.css";
import GlyphIcon from "../GlyphIcon.jsx";
import { isArtifactComplete } from "../../utils/artifactState.js";

function calculateCompletion(project) {
  if (!project) return 0;
  const artifacts = project.phases.flatMap((phase) =>
    (phase.artifacts || []).map((artifact) => ({ artifact, phaseId: phase.id }))
  );
  if (artifacts.length === 0) return 0;
  const completed = artifacts.filter(({ artifact, phaseId }) =>
    isArtifactComplete(artifact, phaseId)
  ).length;
  return Math.round((completed / artifacts.length) * 100);
}

export default function ProjectSummary({ project }) {
  const percent = calculateCompletion(project);

  return (
    <div className={styles.widgetBody}>
      <div className={styles.metricValue}>
        <GlyphIcon name="report" size={22} />
        {percent}%
      </div>
      <div className={styles.metricLabel}>Overall completion</div>
    </div>
  );
}
