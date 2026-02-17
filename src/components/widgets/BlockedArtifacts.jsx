import styles from "../Dashboard.module.css";
import GlyphIcon from "../GlyphIcon.jsx";
import { isArtifactComplete, isArtifactWaived } from "../../utils/artifactState.js";

function isBlockingIncomplete(artifact, phaseId) {
  if (!artifact.isGateBlocking) return false;
  if (isArtifactWaived(artifact)) return false;
  return !isArtifactComplete(artifact, phaseId);
}

export default function BlockedArtifacts({ project }) {
  if (!project) return null;

  const blocked = [];
  project.phases.forEach((phase) => {
    (phase.artifacts || []).forEach((artifact) => {
      if (isBlockingIncomplete(artifact, phase.id)) {
        blocked.push({
          id: artifact.id,
          name: artifact.name,
          phaseId: phase.id,
        });
      }
    });
  });

  if (blocked.length === 0) {
    return <div className={styles.emptyState}>No blocked artifacts.</div>;
  }

  return (
    <ul className={styles.blockedList}>
      {blocked.map((artifact) => (
        <li key={artifact.id} className={styles.blockedItem}>
          <GlyphIcon name="warning" size={12} />
          {artifact.name} (Phase {artifact.phaseId})
        </li>
      ))}
    </ul>
  );
}
