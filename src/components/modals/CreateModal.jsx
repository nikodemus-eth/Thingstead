import { useRef } from "react";
import GlyphIcon from "../GlyphIcon.jsx";
import styles from "../ProjectList.module.css";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import { loadAllPlans } from "../../plans/registry.js";

export default function CreateModal({ createModal, setCreateModal, onSubmitName, onSubmitPlan, onSubmitGovernance }) {
  const modalRef = useRef(null);
  useFocusTrap(modalRef, !!createModal);

  if (!createModal) return null;

  if (createModal.step === "name") {
    return (
      <div className={styles.modalBackdrop}>
        <div
          className={styles.modal}
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label="New project"
        >
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

  if (createModal.step === "plan") {
    const plans = loadAllPlans();
    const planEntries = Object.values(plans);

    return (
      <div className={styles.modalBackdrop}>
        <div
          className={styles.modal}
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label="Choose plan"
        >
          <div className={styles.modalTitle}>Choose a Plan</div>
          <div className={styles.modalBody}>
            Select a governance lifecycle for <strong>{createModal.name}</strong>.
          </div>
          <div className={styles.planCards}>
            {planEntries.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => onSubmitPlan(plan.id)}
                className={styles.planCard}
              >
                <div className={styles.planCardTitle}>{plan.label}</div>
                <div className={styles.planCardMeta}>
                  {plan.phaseCount} phases &middot; {plan.gateModel} gates
                </div>
                <div className={styles.planCardDesc}>{plan.description}</div>
              </button>
            ))}
          </div>
          <div className={styles.modalActions}>
            <button
              type="button"
              onClick={() => setCreateModal({ ...createModal, step: "name" })}
              className={styles.modalCancel}
            >
              Back
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
        <div
          className={styles.modal}
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label="Choose governance mode"
        >
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
