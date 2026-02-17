import { useMemo, useState } from "react";
import MarkdownEditor from "./MarkdownEditor.jsx";
import TemplateFields from "./TemplateFields.jsx";
import WaiverPanel from "./WaiverPanel.jsx";
import GlyphIcon from "./GlyphIcon.jsx";
import styles from "./ArtifactList.module.css";
import {
  getTemplateForArtifact,
  isRequiredFieldSatisfied,
} from "../utils/templateHelpers.js";
import { computeArtifactStatus, isArtifactComplete, isArtifactWaived } from "../utils/artifactState.js";
import { statusLabel } from "../utils/statusHelpers.js";
import { guidanceForTemplateField } from "../utils/fieldGuidance.js";

const EMPTY_TEMPLATE_DATA = {};

function buildGuidedSteps(artifactTemplate) {
  const steps = [];
  if (artifactTemplate?.fields?.length) {
    artifactTemplate.fields.forEach((field) => steps.push({ kind: "template", field }));
  }
  steps.push({ kind: "rationale" });
  steps.push({ kind: "notes" });
  return steps;
}

function stepTitle(step) {
  if (step.kind === "template") return step.field.label;
  if (step.kind === "rationale") return "Rationale";
  return "Notes";
}

function isStepRequiredSatisfied(step, templateData) {
  if (step.kind !== "template") return true;
  if (!step.field.required) return true;
  return isRequiredFieldSatisfied(step.field, templateData[step.field.fieldId]);
}

export default function ArtifactEditor({
  artifact,
  currentPhaseId,
  onArtifactChange,
  onWaiverChange,
  actorId,
}) {
  const [mode, setMode] = useState("guided"); // guided | direct
  const [stepIndex, setStepIndex] = useState(0);

  const artifactName = artifact?.name || null;
  const phaseRef = useMemo(() => ({ id: currentPhaseId, phase_number: currentPhaseId }), [currentPhaseId]);
  const artifactTemplateInfo = useMemo(() => {
    if (!artifactName) return { template: null, binding: "missing" };
    return getTemplateForArtifact(phaseRef, artifact);
  }, [artifactName, phaseRef, artifact]);
  const artifactTemplate = artifactTemplateInfo.template;

  const templateData =
    artifact?.field_values ||
    artifact?.templateData ||
    EMPTY_TEMPLATE_DATA;
  const steps = useMemo(() => buildGuidedSteps(artifactTemplate), [artifactTemplate]);

  const computedStatus = computeArtifactStatus(artifact, currentPhaseId);
  const computedLabel = statusLabel(computedStatus);

  const isGateBlocking = Boolean(artifact?.isGateBlocking);
  const isWaived = isArtifactWaived(artifact);
  const isComplete = isArtifactComplete(artifact, currentPhaseId);

  const currentStep = steps[Math.min(stepIndex, Math.max(steps.length - 1, 0))];
  const canGoNext =
    mode !== "guided" ||
    !currentStep ||
    isStepRequiredSatisfied(currentStep, templateData);

  const handleTemplateFieldChange = (fieldId, value) => {
    const current = artifact.field_values || artifact.templateData || {};
    onArtifactChange({
      field_values: {
        ...current,
        [fieldId]: value,
      },
      templateData: {
        ...current,
        [fieldId]: value,
      },
    });
  };

  const handleFieldChange = (field, value) => {
    onArtifactChange({ [field]: value });
  };

  const renderGuidedInput = () => {
    if (!currentStep) return null;

    if (currentStep.kind === "rationale") {
      return (
        <div className={styles.field}>
          <label htmlFor="artifact-rationale">Rationale</label>
          <textarea
            id="artifact-rationale"
            value={artifact.rationale || ""}
            onChange={(event) => handleFieldChange("rationale", event.target.value)}
          />
        </div>
      );
    }

    if (currentStep.kind === "notes") {
      return (
        <div className={styles.field}>
          <label htmlFor="artifact-notes">Notes</label>
          <MarkdownEditor
            value={artifact.notes || ""}
            onChange={(value) => handleFieldChange("notes", value)}
            placeholder={`Add ${artifact.name} notes in markdown...`}
          />
        </div>
      );
    }

    const field = currentStep.field;
    const value = templateData[field.fieldId];

    const labelId = `template-${field.fieldId}`;
    return (
      <div className={styles.templateField}>
        <label className={styles.templateLabel} htmlFor={labelId}>
          {field.label}
          {field.required ? " *" : ""}
          {field.gateBlocking ? " (Gate Blocking)" : ""}
        </label>

        {field.type === "short_text" && (
          <input
            id={labelId}
            type="text"
            value={value || ""}
            onChange={(event) => handleTemplateFieldChange(field.fieldId, event.target.value)}
          />
        )}
        {field.type === "long_text" && (
          <textarea
            id={labelId}
            value={value || ""}
            onChange={(event) => handleTemplateFieldChange(field.fieldId, event.target.value)}
          />
        )}
        {field.type === "date" && (
          <input
            id={labelId}
            type="date"
            value={value || ""}
            onChange={(event) => handleTemplateFieldChange(field.fieldId, event.target.value)}
          />
        )}
        {field.type === "selection" && (
          <select
            id={labelId}
            value={value || ""}
            onChange={(event) => handleTemplateFieldChange(field.fieldId, event.target.value)}
          >
            <option value="">Select...</option>
            {(field.options || []).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        )}
        {field.type === "checklist" && (
          <div className={styles.checklist}>
            {(field.items || []).map((item) => {
              const label = typeof item === "string" ? item : item?.label || "";
              const checked = Array.isArray(value) ? value.includes(label) : false;
              return (
                <label key={label} className={styles.checkItem}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const selected = new Set(Array.isArray(value) ? value : []);
                      if (event.target.checked) selected.add(label);
                      else selected.delete(label);
                      handleTemplateFieldChange(field.fieldId, [...selected]);
                    }}
                  />
                  {label}
                </label>
              );
            })}
          </div>
        )}
        {field.type === "table" && (
          <div className={styles.tableWrap}>
            <table className={styles.tableField}>
              <thead>
                <tr>
                  {(field.columns || []).map((column) => (
                    <th key={column.name}>{column.name}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(Array.isArray(value) ? value : []).map((row, rowIndex) => (
                  <tr key={`${field.fieldId}-${rowIndex}`}>
                    {(field.columns || []).map((column) => (
                      <td key={`${rowIndex}-${column.name}`}>
                        <input
                          type="text"
                          value={row?.[column.name] || ""}
                          onChange={(event) => {
                            const rows = Array.isArray(value) ? [...value] : [];
                            const nextRow = { ...(rows[rowIndex] || {}) };
                            nextRow[column.name] = event.target.value;
                            rows[rowIndex] = nextRow;
                            handleTemplateFieldChange(field.fieldId, rows);
                          }}
                        />
                      </td>
                    ))}
                    <td>
                      <button
                        type="button"
                        className={styles.tableRemove}
                        onClick={() => {
                          const rows = Array.isArray(value) ? [...value] : [];
                          rows.splice(rowIndex, 1);
                          handleTemplateFieldChange(field.fieldId, rows);
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              type="button"
              className={styles.tableAdd}
              onClick={() => {
                const rows = Array.isArray(value) ? [...value] : [];
                const nextRow = {};
                (field.columns || []).forEach((column) => {
                  nextRow[column.name] = "";
                });
                rows.push(nextRow);
                handleTemplateFieldChange(field.fieldId, rows);
              }}
            >
              Add Row
            </button>
          </div>
        )}
      </div>
    );
  };

  const guidance = useMemo(() => {
    if (!currentStep) return null;
    if (currentStep.kind === "template") {
      return guidanceForTemplateField(currentStep.field, isGateBlocking);
    }
    if (currentStep.kind === "rationale") {
      return {
        why: "Rationale captures the reason behind decisions, waivers, and claims. It makes the work reviewable and auditable.",
        goodLooksLike: "Write clearly enough that a reviewer can agree or disagree with evidence. Avoid vague statements.",
        gateText: isGateBlocking
          ? "If this artifact is gate-blocking, clear rationale often determines whether the gate can be passed (or waived)."
          : "Rationale improves auditability and supports downstream decisions.",
      };
    }
    return {
      why: "Notes are the working record: analysis, assumptions, links, and decisions. They become the artifact's paper trail.",
      goodLooksLike: "Use headings, bullets, and specific evidence. Include measurable details and constraints.",
      gateText: isGateBlocking
        ? "If this artifact is gate-blocking, notes contribute to meeting required completion criteria."
        : "Notes improve reviewability even when not gate-blocking.",
    };
  }, [currentStep, isGateBlocking]);

  if (!artifact) return null;

  return (
    <>
      {(artifactTemplateInfo.binding === "mismatch" ||
        artifactTemplateInfo.binding === "unresolved" ||
        artifactTemplateInfo.binding === "registry-corrupt") && (
        <div className={styles.validationError} style={{ marginBottom: 10 }}>
          Template binding could not be verified ({artifactTemplateInfo.binding}). This artifact cannot be completed until the template version is resolved (or it is explicitly waived).
        </div>
      )}
      <div className={styles.editorTitle}>
        <GlyphIcon name="modify" size={15} />
        Artifact
        <span style={{ opacity: 0.85, marginLeft: 8 }}>
          {computedLabel}
          {isWaived ? " (Waiver)" : ""}
          {isComplete && !isWaived ? "" : ""}
        </span>
      </div>

      <div className={styles.field}>
        <label className={styles.templateLabel}>Mode</label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            type="button"
            className={mode === "guided" ? styles.editorPrimary : styles.editorSecondary}
            onClick={() => setMode("guided")}
          >
            Guided Mode
          </button>
          <button
            type="button"
            className={mode === "direct" ? styles.editorPrimary : styles.editorSecondary}
            onClick={() => setMode("direct")}
          >
            Direct Mode
          </button>
        </div>
      </div>

      <WaiverPanel artifact={artifact} actorId={actorId} onWaiverChange={onWaiverChange} />

      {mode === "direct" ? (
        <>
          {artifactTemplate && (
            <TemplateFields
              template={artifactTemplate}
              templateData={templateData}
              onFieldChange={handleTemplateFieldChange}
            />
          )}
          <div className={styles.field}>
            <label htmlFor="artifact-rationale">Rationale</label>
            <textarea
              id="artifact-rationale"
              value={artifact.rationale || ""}
              onChange={(event) => handleFieldChange("rationale", event.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="artifact-notes">Notes</label>
            <MarkdownEditor
              value={artifact.notes || ""}
              onChange={(value) => handleFieldChange("notes", value)}
              placeholder={`Add ${artifact.name} notes in markdown...`}
            />
          </div>
        </>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
          <div>
            {artifactTemplate && (
              <div className={styles.templateDescription}>
                <GlyphIcon name="template" size={14} />{" "}
                {artifactTemplate.name} Template
              </div>
            )}

            {renderGuidedInput()}

            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button
                type="button"
                className={styles.editorSecondary}
                onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                disabled={stepIndex === 0}
              >
                Back
              </button>
              <button
                type="button"
                className={styles.editorPrimary}
                onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
                disabled={!canGoNext || stepIndex >= steps.length - 1}
              >
                Next
              </button>
            </div>

            {!canGoNext && (
              <div className={styles.validationError} style={{ marginTop: 8 }}>
                This step is required. Complete it before continuing.
              </div>
            )}

            <div style={{ marginTop: 12, opacity: 0.9 }}>
              <div className={styles.groupTitle}>
                <GlyphIcon name="guided" size={12} /> Checklist
              </div>
              <ul className={styles.checklistList} style={{ marginTop: 6 }}>
                {steps.map((step, idx) => {
                  const ok = isStepRequiredSatisfied(step, templateData);
                  const isActive = idx === stepIndex;
                  return (
                    <li
                      key={`${step.kind}-${idx}`}
                      className={styles.checklistItem}
                      style={{
                        opacity: isActive ? 1 : 0.7,
                        fontWeight: isActive ? 800 : 600,
                      }}
                    >
                      <GlyphIcon name={ok ? "check" : "pending"} size={12} />
                      {stepTitle(step)}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          <aside
            style={{
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-md)",
              padding: 14,
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div className={styles.groupTitle}>
              <GlyphIcon name="audit" size={12} /> Why this matters
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.45 }}>{guidance?.why}</div>

            <div className={styles.groupTitle} style={{ marginTop: 12 }}>
              <GlyphIcon name="report" size={12} /> What good looks like
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.45 }}>{guidance?.goodLooksLike}</div>

            <div className={styles.groupTitle} style={{ marginTop: 12 }}>
              <GlyphIcon name="gate" size={12} /> Gate readiness
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.45 }}>{guidance?.gateText}</div>
          </aside>
        </div>
      )}
    </>
  );
}
