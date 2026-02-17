import { useState } from "react";
import GlyphIcon from "./GlyphIcon.jsx";
import styles from "./ArtifactList.module.css";

export default function WaiverPanel({ artifact, actorId, onWaiverChange }) {
  const existing = artifact?.waiver?.waived ? artifact.waiver : null;
  const [waived, setWaived] = useState(Boolean(existing));
  const [rationale, setRationale] = useState(existing?.rationale || "");
  const [error, setError] = useState("");

  const apply = () => {
    if (!waived) {
      onWaiverChange(null);
      setError("");
      return;
    }
    const trimmed = (rationale || "").trim();
    if (trimmed.replace(/\s+/g, "").length < 20) {
      setError("Waiver rationale must be at least 20 non-whitespace characters.");
      return;
    }
    setError("");
    onWaiverChange({
      waived: true,
      rationale: trimmed,
      waived_at: new Date().toISOString(),
      waived_by: actorId,
    });
  };

  return (
    <div className={styles.field}>
      <label className={styles.templateLabel}>
        <GlyphIcon name="waiver" size={14} /> Waiver
      </label>
      <label className={styles.checkItem}>
        <input
          type="checkbox"
          checked={waived}
          onChange={(e) => {
            setWaived(e.target.checked);
            if (!e.target.checked) setRationale("");
            if (error) setError("");
          }}
          aria-label="Waive this artifact"
        />
        Waive this artifact (explicitly)
      </label>
      {waived && (
        <>
          <label htmlFor="waiver-rationale">Waiver rationale (20+ chars)</label>
          <textarea
            id="waiver-rationale"
            aria-label="Waiver rationale"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
          />
        </>
      )}
      {error && <div className={styles.validationError}>{error}</div>}
      <button type="button" className={styles.tableAdd} onClick={apply}>
        {waived ? "Apply Waiver" : "Remove Waiver"}
      </button>
    </div>
  );
}
