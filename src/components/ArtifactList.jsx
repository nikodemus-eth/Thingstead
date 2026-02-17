import { useEffect, useMemo, useRef, useState } from "react";
import { useProject } from "../contexts/ProjectContext.jsx";
import ArtifactEditor from "./ArtifactEditor.jsx";
import CommentSection from "./CommentSection.jsx";
import GlyphIcon from "./GlyphIcon.jsx";
import styles from "./ArtifactList.module.css";
import { computeArtifactStatus, isArtifactWaived } from "../utils/artifactState.js";
import { statusGlyph, artifactGlyph } from "../utils/statusHelpers.js";

export default function ArtifactList({
  currentPhaseId,
  highlightedArtifactId,
}) {
  const { state, dispatch } = useProject();
  const [editingId, setEditingId] = useState(null);
  const editorRef = useRef(null);

  const phase = useMemo(() => {
    return state.currentProject?.phases?.find((p) => p.id === currentPhaseId);
  }, [state.currentProject, currentPhaseId]);

  const grouped = useMemo(() => {
    const buckets = { core: [], conditional: [], supplemental: [] };
    (phase?.artifacts || []).forEach((artifact) => {
      const key = buckets[artifact.category] ? artifact.category : "supplemental";
      buckets[key].push(artifact);
    });
    return buckets;
  }, [phase]);

  const selectedArtifactId = useMemo(() => {
    if (!phase?.artifacts) return editingId;
    if (
      highlightedArtifactId &&
      phase.artifacts.some((artifact) => artifact.id === highlightedArtifactId)
    ) {
      return highlightedArtifactId;
    }
    return editingId;
  }, [editingId, highlightedArtifactId, phase]);

  const editingArtifact = phase?.artifacts?.find(
    (artifact) => artifact.id === selectedArtifactId
  );

  const actorId =
    state.currentProject?.project_owner ||
    `owner:${state.settings?.deviceId || "unknown-device"}`;

  useEffect(() => {
    if (!editingArtifact || !editorRef.current) return;
    editorRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [editingArtifact]);

  const handleArtifactChange = (changes) => {
    if (!editingArtifact) return;
    dispatch({
      type: "UPDATE_ARTIFACT",
      payload: {
        phaseId: currentPhaseId,
        artifactId: editingArtifact.id,
        changes: { ...changes, lastModified: new Date().toISOString() },
      },
    });
  };

  const handleWaiverChange = (waiver) => {
    if (!editingArtifact) return;
    dispatch({
      type: "SET_ARTIFACT_WAIVER",
      payload: {
        phaseId: currentPhaseId,
        artifactId: editingArtifact.id,
        waiver,
        actorId,
      },
    });
  };

  const handleCommentsChange = (nextComments) => {
    handleArtifactChange({ comments: nextComments });
  };

  if (!state.currentProject) {
    return (
      <div className={styles.empty}>
        Select a project to begin.
        <br />
        Projects are stored in this browser only. On another device/browser, use{" "}
        <strong>Export JSON</strong> on the source machine, then{" "}
        <strong>Import Project</strong> on this one.
      </div>
    );
  }

  if (!phase) {
    return <div className={styles.empty}>Phase not found.</div>;
  }

  return (
    <section className={styles.container}>
      <div className={styles.title}>
        <GlyphIcon name="artifact" size={16} />
        Phase {phase.id}: {phase.name}
      </div>

      {Object.entries(grouped).map(([category, artifacts]) => (
        <div key={category} className={styles.group}>
          <div className={styles.groupTitle}>
            <GlyphIcon name={artifactGlyph(category)} size={14} />
            {category}
          </div>
          {artifacts.length === 0 ? (
            <div className={styles.empty}>No artifacts.</div>
          ) : (
            <ul className={styles.list}>
              {artifacts.map((artifact) => (
                <li key={artifact.id} className={styles.listItem}>
                  {(() => {
                    const computed = computeArtifactStatus(artifact, currentPhaseId);
                    const statusLabel =
                      computed === "waived"
                        ? "waived"
                        : computed === "complete"
                        ? "complete"
                        : computed === "in-progress"
                        ? "in-progress"
                        : "not-started";
                    return (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(artifact.id);
                        }}
                        className={
                          artifact.id === selectedArtifactId
                            ? styles.activeArtifact
                            : artifact.id === highlightedArtifactId
                            ? styles.highlightArtifact
                            : styles.artifactButton
                        }
                      >
                        <span className={styles.artifactName}>
                          <GlyphIcon name={artifactGlyph(artifact.category)} size={14} />
                          {artifact.name}
                          {artifact.isGateBlocking && (
                            <span className={styles.gateBlockingTag}>
                              <GlyphIcon name="gate" size={12} />
                              Gate-blocking
                            </span>
                          )}
                          {isArtifactWaived(artifact) && (
                            <span className={styles.waiverTag}>
                              <GlyphIcon name="waiver" size={12} />
                              Waived
                            </span>
                          )}
                        </span>
                        <span className={styles.status}>
                          <GlyphIcon name={statusGlyph(computed)} size={12} />
                          {statusLabel}
                        </span>
                      </button>
                    );
                  })()}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      {editingArtifact && (
        <div ref={editorRef} className={styles.editor}>
          <ArtifactEditor
            key={editingArtifact.id}
            artifact={editingArtifact}
            currentPhaseId={currentPhaseId}
            onArtifactChange={handleArtifactChange}
            onWaiverChange={handleWaiverChange}
            actorId={actorId}
          />
          <CommentSection
            comments={editingArtifact.comments}
            actorId={actorId}
            onCommentsChange={handleCommentsChange}
          />
        </div>
      )}
    </section>
  );
}
