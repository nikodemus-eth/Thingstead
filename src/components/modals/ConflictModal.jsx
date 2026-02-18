import { useRef } from "react";
import GlyphIcon from "../GlyphIcon.jsx";
import styles from "../ProjectList.module.css";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";

export default function ConflictModal({ projectName, onResolve }) {
  const modalRef = useRef(null);
  useFocusTrap(modalRef, true);

  return (
    <div className={styles.modalBackdrop}>
      <div
        className={styles.modal}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Sync conflict"
      >
        <div className={styles.modalTitle}>
          <GlyphIcon name="conflict" size={14} />
          Sync Conflict
        </div>
        <div className={styles.modalBody}>
          The project &ldquo;{projectName}&rdquo; was modified on another device since your last sync.
          Choose how to proceed.
        </div>
        <div className={styles.modalActions}>
          <button
            type="button"
            onClick={() => onResolve("mine")}
            className={`${styles.modalPrimary} ${styles.withIcon}`}
          >
            <GlyphIcon name="save" size={14} />
            <span>Use Mine</span>
          </button>
          <button
            type="button"
            onClick={() => onResolve("theirs")}
            className={`${styles.modalSecondary} ${styles.withIcon}`}
          >
            <GlyphIcon name="guided" size={14} />
            <span>Use Theirs</span>
          </button>
          <button
            type="button"
            onClick={() => onResolve("both")}
            className={`${styles.modalSecondary} ${styles.withIcon}`}
          >
            <GlyphIcon name="conflict" size={14} />
            <span>Keep Both</span>
          </button>
          <button
            type="button"
            onClick={() => onResolve("cancel")}
            className={`${styles.modalCancel} ${styles.withIcon}`}
          >
            <GlyphIcon name="x" size={14} />
            <span>Cancel</span>
          </button>
        </div>
      </div>
    </div>
  );
}
