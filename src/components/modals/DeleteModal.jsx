import { useRef } from "react";
import GlyphIcon from "../GlyphIcon.jsx";
import styles from "../ProjectList.module.css";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";

export default function DeleteModal({ onConfirm, onCancel }) {
  const modalRef = useRef(null);
  useFocusTrap(modalRef, true);

  return (
    <div className={styles.modalBackdrop}>
      <div
        className={styles.modal}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Delete project"
      >
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
