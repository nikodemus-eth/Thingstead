import GlyphIcon from "../GlyphIcon.jsx";
import styles from "../ProjectList.module.css";

export default function DeleteModal({ onConfirm, onCancel }) {
  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <div className={styles.modalTitle}>Delete Project</div>
        <div className={styles.modalBody}>
          Delete this project? This cannot be undone.
        </div>
        <div className={styles.modalActions}>
          <button
            type="button"
            onClick={onConfirm}
            className={`${styles.deleteButton} ${styles.withIcon}`}
          >
            <GlyphIcon name="remove" size={14} />
            <span>Delete</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={styles.modalCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
