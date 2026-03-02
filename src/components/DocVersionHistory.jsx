import GlyphIcon from "./GlyphIcon.jsx";
import styles from "./DocVersionHistory.module.css";

const DOC_STATUS_LABELS = {
  DRAFT: "Draft",
  IN_REVIEW: "In Review",
  APPROVED: "Approved",
  HISTORICAL: "Historical",
};

const DOC_STATUS_TRANSITIONS = {
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["DRAFT", "APPROVED"],
  APPROVED: ["HISTORICAL"],
  HISTORICAL: [],
};

export default function DocVersionHistory({ docStatus, docVersions, onStatusChange, onCreateVersion }) {
  if (!docStatus) return null;

  const versions = docVersions || [];
  const transitions = DOC_STATUS_TRANSITIONS[docStatus] || [];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <GlyphIcon name="guided" size={14} />
        <span>Document Status</span>
      </div>

      <div className={styles.statusRow}>
        <span className={`${styles.statusBadge} ${styles[`status_${docStatus}`]}`}>
          {DOC_STATUS_LABELS[docStatus] || docStatus}
        </span>
        {transitions.length > 0 && (
          <span className={styles.transitions}>
            {transitions.map((nextStatus) => (
              <button
                key={nextStatus}
                type="button"
                onClick={() => onStatusChange(nextStatus)}
                className={styles.transitionBtn}
              >
                &rarr; {DOC_STATUS_LABELS[nextStatus]}
              </button>
            ))}
          </span>
        )}
      </div>

      {docStatus === "APPROVED" && onCreateVersion && (
        <button
          type="button"
          onClick={onCreateVersion}
          className={styles.versionBtn}
        >
          <GlyphIcon name="add" size={12} />
          Create New Version
        </button>
      )}

      {versions.length > 0 && (
        <div className={styles.versionList}>
          <div className={styles.versionLabel}>Version History</div>
          {versions.map((v, i) => (
            <div key={i} className={styles.versionItem}>
              <span className={styles.versionNumber}>v{v.version}</span>
              <span className={styles.versionDate}>
                {new Date(v.createdAt).toLocaleDateString()}
              </span>
              <span className={styles.versionNotes}>{v.notes}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
