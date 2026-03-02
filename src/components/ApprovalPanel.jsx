import { useState } from "react";
import GlyphIcon from "./GlyphIcon.jsx";
import styles from "./ApprovalPanel.module.css";

const ROLE_LABELS = {
  EXEC_SPONSOR: "Executive Sponsor",
  SYS_OWNER: "System Owner",
  DATA_OWNER: "Data Owner",
  MODEL_OWNER: "Model Owner",
  SEC_AUTHORITY: "Security Authority",
  GOV_AUTHORITY: "Governance Authority",
  DATA_STEWARD: "Data Steward",
  VENDOR_REP: "Vendor Representative",
  PROJECT_MGR: "Project Manager",
  TECH_LEAD: "Technical Lead",
};

export default function ApprovalPanel({ approvals, onUpdateApprovals }) {
  const [editingIndex, setEditingIndex] = useState(null);
  const [editName, setEditName] = useState("");

  if (!approvals || approvals.length === 0) return null;

  const handleSign = (index) => {
    setEditingIndex(index);
    setEditName(approvals[index].name || "");
  };

  const handleConfirmSign = () => {
    if (editingIndex === null || !editName.trim()) return;
    const updated = approvals.map((a, i) =>
      i === editingIndex
        ? { ...a, name: editName.trim(), signedAt: new Date().toISOString() }
        : a
    );
    onUpdateApprovals(updated);
    setEditingIndex(null);
    setEditName("");
  };

  const handleUnsign = (index) => {
    const updated = approvals.map((a, i) =>
      i === index ? { ...a, name: "", signedAt: null } : a
    );
    onUpdateApprovals(updated);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditName("");
  };

  const signedCount = approvals.filter((a) => a.signedAt).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <GlyphIcon name="audit" size={14} />
        <span>Approval Signatures</span>
        <span className={styles.badge}>
          {signedCount}/{approvals.length}
        </span>
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Role</th>
            <th>Signer</th>
            <th>Date</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {approvals.map((approval, index) => (
            <tr key={approval.role} className={approval.signedAt ? styles.signed : styles.unsigned}>
              <td className={styles.roleCell}>
                {ROLE_LABELS[approval.role] || approval.role}
              </td>
              <td>
                {editingIndex === index ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleConfirmSign();
                      if (e.key === "Escape") handleCancelEdit();
                    }}
                    className={styles.nameInput}
                    placeholder="Signer name"
                    autoFocus
                  />
                ) : (
                  <span className={approval.signedAt ? styles.signerName : styles.signerEmpty}>
                    {approval.name || "\u2014"}
                  </span>
                )}
              </td>
              <td className={styles.dateCell}>
                {approval.signedAt
                  ? new Date(approval.signedAt).toLocaleDateString()
                  : "\u2014"}
              </td>
              <td>
                {editingIndex === index ? (
                  <span className={styles.editActions}>
                    <button
                      type="button"
                      onClick={handleConfirmSign}
                      disabled={!editName.trim()}
                      className={styles.confirmBtn}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className={styles.cancelBtn}
                    >
                      Cancel
                    </button>
                  </span>
                ) : approval.signedAt ? (
                  <button
                    type="button"
                    onClick={() => handleUnsign(index)}
                    className={styles.unsignBtn}
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSign(index)}
                    className={styles.signBtn}
                  >
                    Sign
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
