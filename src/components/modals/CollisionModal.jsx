import GlyphIcon from "../GlyphIcon.jsx";
import styles from "../ProjectList.module.css";

export default function CollisionModal({ onResolve }) {
  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <div className={styles.modalTitle}>Import Collision</div>
        <div className={styles.modalBody}>
          A project with this ID already exists. Choose how to proceed.
        </div>
        <div className={styles.modalActions}>
          <button
            type="button"
            onClick={() => onResolve("overwrite")}
            className={`${styles.modalPrimary} ${styles.withIcon}`}
          >
            <GlyphIcon name="warning" size={14} />
            <span>Overwrite existing project</span>
          </button>
          <button
            type="button"
            onClick={() => onResolve("keep-both")}
            className={`${styles.modalSecondary} ${styles.withIcon}`}
          >
            <GlyphIcon name="conflict" size={14} />
            <span>Keep both (generate new ID)</span>
          </button>
          <button
            type="button"
            onClick={() => onResolve("cancel")}
            className={`${styles.modalCancel} ${styles.withIcon}`}
          >
            <GlyphIcon name="x" size={14} />
            <span>Cancel import</span>
          </button>
        </div>
      </div>
    </div>
  );
}
