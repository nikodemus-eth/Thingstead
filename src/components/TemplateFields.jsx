import { defaultCellValue } from "../utils/templateHelpers.js";
import GlyphIcon from "./GlyphIcon.jsx";
import styles from "./ArtifactList.module.css";

export default function TemplateFields({
  template,
  templateData,
  onFieldChange,
}) {
  if (!template) return null;

  const handleChange = (fieldId, value) => {
    onFieldChange(fieldId, value);
  };

  const toggleChecklistItem = (fieldId, itemLabel, checked) => {
    const selected = new Set(
      Array.isArray(templateData[fieldId]) ? templateData[fieldId] : []
    );
    if (checked) selected.add(itemLabel);
    else selected.delete(itemLabel);
    handleChange(fieldId, [...selected]);
  };

  const updateTableCell = (field, rowIndex, columnName, value) => {
    const rows = Array.isArray(templateData[field.fieldId])
      ? [...templateData[field.fieldId]]
      : [];
    const row = { ...(rows[rowIndex] || {}) };
    row[columnName] = value;
    rows[rowIndex] = row;
    handleChange(field.fieldId, rows);
  };

  const addTableRow = (field) => {
    const rows = Array.isArray(templateData[field.fieldId])
      ? [...templateData[field.fieldId]]
      : [];
    const nextRow = {};
    (field.columns || []).forEach((column) => {
      nextRow[column.name] = defaultCellValue(column);
    });
    rows.push(nextRow);
    handleChange(field.fieldId, rows);
  };

  const removeTableRow = (field, rowIndex) => {
    const rows = Array.isArray(templateData[field.fieldId])
      ? [...templateData[field.fieldId]]
      : [];
    rows.splice(rowIndex, 1);
    handleChange(field.fieldId, rows);
  };

  return (
    <div className={styles.templateSection}>
      <div className={styles.templateHeader}>
        <GlyphIcon name="template" size={14} />
        <span>{template.name} Template</span>
      </div>
      {template.description && (
        <div className={styles.templateDescription}>{template.description}</div>
      )}
      {(template.fields || []).map((field) => (
        <div key={field.fieldId} className={styles.templateField}>
          <label className={styles.templateLabel}>
            {field.label}
            {field.required ? " *" : ""}
            {field.gateBlocking ? " (Gate Blocking)" : ""}
          </label>
          {field.type === "short_text" && (
            <input
              type="text"
              value={templateData[field.fieldId] || ""}
              onChange={(event) => handleChange(field.fieldId, event.target.value)}
            />
          )}
          {field.type === "long_text" && (
            <textarea
              value={templateData[field.fieldId] || ""}
              onChange={(event) => handleChange(field.fieldId, event.target.value)}
            />
          )}
          {field.type === "date" && (
            <input
              type="date"
              value={templateData[field.fieldId] || ""}
              onChange={(event) => handleChange(field.fieldId, event.target.value)}
            />
          )}
          {field.type === "selection" && (
            <select
              value={templateData[field.fieldId] || ""}
              onChange={(event) => handleChange(field.fieldId, event.target.value)}
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
                const checked = Array.isArray(templateData[field.fieldId])
                  ? templateData[field.fieldId].includes(label)
                  : false;
                return (
                  <label key={label} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(event) =>
                        toggleChecklistItem(field.fieldId, label, event.target.checked)
                      }
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
                  {(Array.isArray(templateData[field.fieldId])
                    ? templateData[field.fieldId]
                    : []
                  ).map((row, rowIndex) => (
                    <tr key={`${field.fieldId}-${rowIndex}`}>
                      {(field.columns || []).map((column) => (
                        <td key={`${rowIndex}-${column.name}`}>
                          {column.type === "selection" ? (
                            <select
                              value={row?.[column.name] || ""}
                              onChange={(event) =>
                                updateTableCell(
                                  field,
                                  rowIndex,
                                  column.name,
                                  event.target.value
                                )
                              }
                            >
                              <option value="">Select...</option>
                              {(column.options || []).map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={row?.[column.name] || ""}
                              onChange={(event) =>
                                updateTableCell(
                                  field,
                                  rowIndex,
                                  column.name,
                                  event.target.value
                                )
                              }
                            />
                          )}
                        </td>
                      ))}
                      <td>
                        <button
                          type="button"
                          className={styles.tableRemove}
                          onClick={() => removeTableRow(field, rowIndex)}
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
                onClick={() => addTableRow(field)}
              >
                Add Row
              </button>
            </div>
          )}
          {field.helpText && <div className={styles.helpText}>{field.helpText}</div>}
        </div>
      ))}
    </div>
  );
}
