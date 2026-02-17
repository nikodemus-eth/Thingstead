import GlyphIcon from "../GlyphIcon.jsx";
import styles from "../ProjectList.module.css";

export default function CreateModal({ createModal, setCreateModal, onSubmitName, onSubmitGovernance }) {
  if (!createModal) return null;

  if (createModal.step === "name") {
    return (
      <div className={styles.modalBackdrop}>
        <div className={styles.modal}>
          <div className={styles.modalTitle}>New Project</div>
          <div className={styles.modalBody}>
            <label htmlFor="create-project-name">Project name</label>
            <input
              id="create-project-name"
              type="text"
              value={createModal.name}
              onChange={(event) =>
                setCreateModal({ ...createModal, name: event.target.value })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") onSubmitName();
              }}
              autoFocus
            />
          </div>
          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={onSubmitName}
              disabled={!createModal.name.trim()}
              className={styles.modalPrimary}
            >
              Next
            </button>
            <button
              type="button"
              onClick={() => setCreateModal(null)}
              className={styles.modalCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (createModal.step === "governance") {
    return (
      <div className={styles.modalBackdrop}>
        <div className={styles.modal}>
          <div className={styles.modalTitle}>Governance Mode</div>
          <div className={styles.modalBody}>
            Choose a governance mode for <strong>{createModal.name}</strong>.
          </div>
          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={() => onSubmitGovernance("team")}
              className={`${styles.modalPrimary} ${styles.withIcon}`}
            >
              <GlyphIcon name="project" size={14} />
              <span>Team Governance</span>
            </button>
            <button
              type="button"
              onClick={() => onSubmitGovernance("solo")}
              className={`${styles.modalSecondary} ${styles.withIcon}`}
            >
              <GlyphIcon name="direct" size={14} />
              <span>Solo Governance</span>
            </button>
            <button
              type="button"
              onClick={() => setCreateModal(null)}
              className={styles.modalCancel}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
