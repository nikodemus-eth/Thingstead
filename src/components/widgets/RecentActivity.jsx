import styles from "../Dashboard.module.css";
import GlyphIcon from "../GlyphIcon.jsx";

function collectRecent(project) {
  if (!project) return [];
  const items = [];
  project.phases.forEach((phase) => {
    (phase.artifacts || []).forEach((artifact) => {
      if (artifact.lastModified) {
        items.push({
          id: artifact.id,
          phaseId: phase.id,
          name: artifact.name,
          lastModified: artifact.lastModified,
        });
      }
    });
  });

  return items
    .sort((a, b) => (a.lastModified < b.lastModified ? 1 : -1))
    .slice(0, 5);
}

export default function RecentActivity({ project }) {
  const items = collectRecent(project);

  if (items.length === 0) {
    return <div className={styles.emptyState}>No recent activity.</div>;
  }

  return (
    <ul className={styles.activityList}>
      {items.map((item) => (
        <li key={item.id} className={styles.activityItem}>
          <div className={styles.activityTitle}>
            <GlyphIcon name="modify" size={12} />
            {item.name}
          </div>
          <div className={styles.activityMeta}>
            Phase {item.phaseId} • {new Date(item.lastModified).toLocaleString()}
          </div>
        </li>
      ))}
    </ul>
  );
}
