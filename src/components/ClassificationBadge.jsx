import styles from "./ClassificationBadge.module.css";

const LEVEL_STYLES = {
  PUBLIC: { label: "Public", className: "public" },
  INTERNAL: { label: "Internal", className: "internal" },
  CONFIDENTIAL: { label: "Confidential", className: "confidential" },
  CUI: { label: "CUI", className: "cui" },
  RESTRICTED: { label: "Restricted", className: "restricted" },
};

export default function ClassificationBadge({ level, onChange }) {
  if (!level) return null;

  const config = LEVEL_STYLES[level] || { label: level, className: "internal" };

  if (onChange) {
    return (
      <select
        value={level}
        onChange={(e) => onChange(e.target.value)}
        className={`${styles.select} ${styles[config.className]}`}
        aria-label="Classification level"
      >
        {Object.entries(LEVEL_STYLES).map(([code, cfg]) => (
          <option key={code} value={code}>
            {cfg.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <span className={`${styles.badge} ${styles[config.className]}`}>
      {config.label}
    </span>
  );
}
