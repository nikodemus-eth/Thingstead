import { useMemo, useState } from "react";
import { isGateReady } from "../utils/gateLogic.js";
import GlyphIcon from "./GlyphIcon.jsx";
import styles from "./GoNoGoDecision.module.css";

function isValidSoloAttestation(notes) {
  const normalized = typeof notes === "string" ? notes.trim() : "";
  return normalized.replace(/\s+/g, "").length >= 30;
}

export default function GoNoGoDecision({ phase, governanceMode = "team", onDecision }) {
  const [notes, setNotes] = useState(phase?.goNoGoDecision?.notes || "");
  const [error, setError] = useState("");

  const gateReady = useMemo(() => isGateReady(phase), [phase]);
  const decision = phase?.goNoGoDecision || {
    status: "pending",
    decidedAt: null,
    notes: "",
    attestation_type: "team_decision",
  };
  const isDecided = decision.status === "go" || decision.status === "no-go";

  const handleDecision = (status) => {
    if (governanceMode === "solo" && !isValidSoloAttestation(notes)) {
      setError("Solo mode requires attestation notes (minimum 30 non-whitespace characters).");
      return;
    }

    setError("");
    const payload = {
      status,
      decidedAt: new Date().toISOString(),
      notes,
      attestation_type:
        governanceMode === "solo" ? "solo_attestation" : "team_decision",
    };
    if (typeof onDecision === "function") onDecision(payload);
  };

  const handleEdit = () => {
    const payload = {
      status: "pending",
      decidedAt: null,
      notes: "",
      attestation_type:
        governanceMode === "solo" ? "solo_attestation" : "team_decision",
    };
    setNotes("");
    setError("");
    if (typeof onDecision === "function") onDecision(payload);
  };

  if (!gateReady) {
    return (
      <div className={styles.locked}>
        <GlyphIcon name="lock" size={14} />
        Gate Locked - Complete required artifacts first
      </div>
    );
  }

  if (isDecided) {
    return (
      <div className={styles.decided}>
        <div className={styles.decidedHeader}>
          <GlyphIcon name={decision.status === "go" ? "check" : "x"} size={14} />
          Decision: {decision.status.toUpperCase()}
        </div>
        <div className={styles.meta}>Decided at: {decision.decidedAt}</div>
        <div className={styles.meta}>
          <GlyphIcon name="audit" size={12} />
          Attestation:{" "}
          {decision.attestation_type === "solo_attestation"
            ? "Solo Attestation"
            : "Team Decision"}
        </div>
        <div className={styles.notes}>{decision.notes || "No notes."}</div>
        <button type="button" onClick={handleEdit} className={styles.editButton}>
          Edit Decision
        </button>
      </div>
    );
  }

  return (
    <div className={styles.ready}>
      <div className={styles.readyHeader}>
        <GlyphIcon name="gate" size={14} />
        Gate Ready
      </div>
      <label className={styles.label} htmlFor={`gate-notes-${phase.id}`}>
        {governanceMode === "solo" ? "Attestation Notes" : "Notes"}
      </label>
      <textarea
        id={`gate-notes-${phase.id}`}
        value={notes}
        onChange={(event) => {
          setNotes(event.target.value);
          if (error) setError("");
        }}
        className={styles.textarea}
      />
      {governanceMode === "solo" && (
        <div className={styles.hint}>
          <GlyphIcon name="warning" size={12} />
          Solo governance event: include clear rationale and decision consequences.
        </div>
      )}
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.actions}>
        <button type="button" onClick={() => handleDecision("go")}>
          <GlyphIcon name="check" size={12} />
          Go
        </button>
        <button type="button" onClick={() => handleDecision("no-go")}>
          <GlyphIcon name="x" size={12} />
          No-Go
        </button>
      </div>
    </div>
  );
}
