import { useLayoutEffect } from "react";
import GlyphIcon from "../GlyphIcon.jsx";
import styles from "../ProjectList.module.css";

export default function ShareModal({
  shareModal,
  onClose,
  onRunAction,
  webShareFileTransport,
  downloadJsonTransport,
  clipboardJsonTransport,
}) {
  useLayoutEffect(() => {
    if (!shareModal) return;
    const onKey = (e) => {
      if (e.key !== "Escape" && e.key !== "Esc") return;
      try {
        e.preventDefault();
        e.stopPropagation();
      } catch {
        // ignore
      }
      window.requestAnimationFrame(() => onClose());
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("keyup", onKey, true);
    document.addEventListener("keydown", onKey, true);
    document.addEventListener("keyup", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("keyup", onKey, true);
      document.removeEventListener("keydown", onKey, true);
      document.removeEventListener("keyup", onKey, true);
    };
  }, [shareModal, onClose]);

  if (!shareModal) return null;

  return (
    <div
      className={styles.modalBackdrop}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-project-title"
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key !== "Escape" && e.key !== "Esc") return;
          e.preventDefault();
          e.stopPropagation();
          onClose();
        }}
      >
        <div className={styles.modalTitle} id="share-project-title">
          Share Project
        </div>
        <div className={styles.modalBody}>
          Exports a portable JSON bundle. No cloud sync.
          {shareModal.status === "loading" && (
            <div style={{ marginTop: 10, opacity: 0.9 }}>Preparing export…</div>
          )}
          {shareModal.status === "error" && (
            <div style={{ marginTop: 10 }}>
              <strong>Export failed.</strong> {shareModal.error}
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button
            type="button"
            onClick={() => onRunAction(webShareFileTransport)}
            className={`${styles.modalPrimary} ${styles.withIcon}`}
            disabled={
              shareModal.status !== "ready" || !webShareFileTransport.isSupported()
            }
            title={
              webShareFileTransport.isSupported()
                ? undefined
                : "Not supported in this browser."
            }
          >
            <GlyphIcon name="export" size={14} />
            <span>
              Share via device
              {!webShareFileTransport.isSupported()
                ? " (Not supported in this browser.)"
                : ""}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onRunAction(downloadJsonTransport)}
            className={`${styles.modalSecondary} ${styles.withIcon}`}
            disabled={shareModal.status !== "ready"}
          >
            <GlyphIcon name="export" size={14} />
            <span>Download JSON</span>
          </button>

          <button
            type="button"
            onClick={() => onRunAction(clipboardJsonTransport)}
            className={`${styles.modalSecondary} ${styles.withIcon}`}
            disabled={shareModal.status !== "ready" || !clipboardJsonTransport.isSupported()}
          >
            <GlyphIcon name="modify" size={14} />
            <span>Copy JSON to clipboard</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className={styles.modalCancel}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
