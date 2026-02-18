import { useRef } from "react";
import styles from "../ProjectList.module.css";
import helpStyles from "./KeyboardHelpModal.module.css";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";

const SHORTCUTS = [
  { keys: ["Ctrl/Cmd", "Z"], description: "Undo" },
  { keys: ["Ctrl/Cmd", "Shift", "Z"], description: "Redo" },
  { keys: ["Escape"], description: "Close modal / dialog" },
  { keys: ["?"], description: "Open this keyboard shortcut reference" },
  { keys: ["←", "→"], description: "Navigate between phases (in phase bar)" },
  { keys: ["Tab"], description: "Move focus forward through interactive elements" },
  { keys: ["Shift", "Tab"], description: "Move focus backward" },
];

export default function KeyboardHelpModal({ onClose }) {
  const modalRef = useRef(null);
  useFocusTrap(modalRef, true);

  return (
    <div className={styles.modalBackdrop}>
      <div
        className={`${styles.modal} ${helpStyles.modal}`}
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kbd-help-title"
      >
        <div className={styles.modalTitle} id="kbd-help-title">
          Keyboard Shortcuts
        </div>
        <div className={styles.modalBody}>
          <table className={helpStyles.table}>
            <thead>
              <tr>
                <th className={helpStyles.th}>Shortcut</th>
                <th className={helpStyles.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {SHORTCUTS.map(({ keys, description }) => (
                <tr key={description} className={helpStyles.row}>
                  <td className={helpStyles.keys}>
                    {keys.map((k, i) => (
                      <span key={k}>
                        <kbd className={helpStyles.kbd}>{k}</kbd>
                        {i < keys.length - 1 && (
                          <span className={helpStyles.plus}>+</span>
                        )}
                      </span>
                    ))}
                  </td>
                  <td className={helpStyles.desc}>{description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.modalActions}>
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
