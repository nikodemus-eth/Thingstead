import { useState, useEffect } from "react";
import styles from "../Dashboard.module.css";
import GlyphIcon from "../GlyphIcon.jsx";
import { fetchOpenClawAgents, quickPropose, analyzeGate } from "../../utils/openclawBridge.js";
import { timeAgo } from "../../utils/timeAgo.js";

export default function OpenClawAgentsWidget({ project }) {
  const [ocData, setOcData] = useState(project?.openclaw ?? null);
  const [proposing, setProposing] = useState(false);
  const [proposeText, setProposeText] = useState("");
  const [gateResult, setGateResult] = useState(null);

  useEffect(() => {
    if (!project?.id) return;
    let cancelled = false;
    fetchOpenClawAgents(project.id).then((data) => {
      if (!cancelled && data) setOcData(data);
    });
    return () => { cancelled = true; };
  }, [project?.id]);

  // Keep in sync when the prop updates (e.g. after a save)
  useEffect(() => {
    if (project?.openclaw) setOcData(project.openclaw);
  }, [project?.openclaw]);

  const agents = ocData?.linkedAgentIds ?? [];
  const draftCount = Object.keys(ocData?.advisoryDrafts ?? {}).length;
  const lastHb = ocData?.lastAgentHeartbeat ?? null;

  const handlePropose = async () => {
    if (!project?.id || !proposeText.trim()) return;
    setProposing(true);
    const draftId = `draft-${Date.now()}`;
    await quickPropose({ projectId: project.id, draftId, content: proposeText.trim() });
    setProposeText("");
    // Refresh data after submitting
    const fresh = await fetchOpenClawAgents(project.id);
    if (fresh) setOcData(fresh);
    setProposing(false);
  };

  const handleAnalyzeGate = async () => {
    if (!project?.id) return;
    const result = await analyzeGate(project.id, 1);
    setGateResult(result);
  };

  if (!project) return null;

  return (
    <div className={styles.widgetBody}>
      {agents.length === 0 ? (
        <div className={styles.emptyState}>No agents linked.</div>
      ) : (
        <ul className={styles.activityList}>
          {agents.map((agentId) => (
            <li key={agentId} className={styles.activityItem}>
              <GlyphIcon name="audit" size={12} />
              <span className={styles.badge}>{agentId}</span>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.metaRow}>
        <span>Last heartbeat: {timeAgo(lastHb)}</span>
        {draftCount > 0 && (
          <span>{draftCount} advisory draft{draftCount !== 1 ? "s" : ""}</span>
        )}
      </div>

      <div className={styles.proposeForm}>
        <textarea
          className={styles.proposeInput}
          rows={2}
          placeholder="Advisory draft content…"
          value={proposeText}
          onChange={(e) => setProposeText(e.target.value)}
          disabled={proposing}
        />
        <div className={styles.proposeActions}>
          <button
            type="button"
            className={styles.controlButton}
            onClick={handlePropose}
            disabled={proposing || !proposeText.trim()}
          >
            <GlyphIcon name="audit" size={12} />
            {proposing ? "Proposing…" : "Propose"}
          </button>
          <button
            type="button"
            className={styles.controlButton}
            onClick={handleAnalyzeGate}
          >
            Analyze Gate
          </button>
        </div>
      </div>

      {gateResult && (
        <div className={styles.metaRow}>
          Gate advisory: {gateResult.ready ? "✓ Ready" : "Blocked"} (phase {gateResult.phaseNumber})
        </div>
      )}
    </div>
  );
}
