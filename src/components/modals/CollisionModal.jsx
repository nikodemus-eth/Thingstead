import { useRef } from "react";
import GlyphIcon from "../GlyphIcon.jsx";
import styles from "../ProjectList.module.css";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";

export default function CollisionModal({ onResolve }) {
  const modalRef = useRef(null);
  useFocusTrap(modalRef, true);

  return (
    <div className={styles.modalBackdrop}>
      <div
        className={styles.modal}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label="Import collision"
      >
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
