import { useEffect, useMemo, useState } from "react";
import { useProject } from "../contexts/ProjectContext.jsx";
import styles from "./Search.module.css";

const DEBOUNCE_MS = 300;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightText(text, query) {
  if (!query) return text;
  const regex = new RegExp(escapeRegex(query), "ig");
  const parts = text.split(regex);
  const matches = text.match(regex) || [];
  if (matches.length === 0) return text;

  const output = [];
  parts.forEach((part, index) => {
    output.push(part);
    if (index < matches.length) {
      output.push(<mark key={`${index}-${matches[index]}`}>{matches[index]}</mark>);
    }
  });
  return output;
}

function makeSnippet(text, query) {
  if (!text) return "";
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const index = lower.indexOf(q);
  if (index === -1) return text.slice(0, 100);
  const start = Math.max(0, index - 50);
  const end = Math.min(text.length, index + q.length + 50);
  const prefix = start > 0 ? "…" : "";
  const suffix = end < text.length ? "…" : "";
  return `${prefix}${text.slice(start, end)}${suffix}`;
}

function collectMatches(project, query) {
  if (!project || !query) return [];
  const results = [];
  const q = query.toLowerCase();

  project.phases.forEach((phase) => {
    const phaseMatches = [];

    if (phase.name?.toLowerCase().includes(q)) {
      phaseMatches.push({
        type: "phase",
        phaseId: phase.id,
        label: phase.name,
        snippet: makeSnippet(phase.name, query),
      });
    }

    phase.artifacts.forEach((artifact) => {
      const haystacks = [
        { field: "name", value: artifact.name },
        { field: "notes", value: artifact.notes },
        { field: "rationale", value: artifact.rationale },
      ];

      const matchField = haystacks.find((item) =>
        item.value?.toLowerCase().includes(q)
      );

      if (matchField) {
        phaseMatches.push({
          type: "artifact",
          phaseId: phase.id,
          artifactId: artifact.id,
          label: artifact.name,
          snippet: makeSnippet(matchField.value, query),
        });
      }
    });

    if (phaseMatches.length > 0) {
      results.push({ phaseId: phase.id, phaseName: phase.name, matches: phaseMatches });
    }
  });

  return results;
}

export default function Search({ onSelectResult }) {
  const { state } = useProject();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    return collectMatches(state.currentProject, debouncedQuery);
  }, [state.currentProject, debouncedQuery]);

  const totalMatches = results.reduce(
    (acc, group) => acc + group.matches.length,
    0
  );

  const handleClear = () => {
    setQuery("");
    setDebouncedQuery("");
  };

  const handleSelect = (match) => {
    onSelectResult(match);
    handleClear();
  };

  return (
    <div className={styles.container}>
      <div className={styles.inputRow}>
        <input
          type="text"
          className={styles.input}
          placeholder="Search artifacts, phases, notes, rationale…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button type="button" className={styles.clearButton} onClick={handleClear}>
            ×
          </button>
        )}
      </div>

      {debouncedQuery && (
        <div className={styles.panel}>
          <div className={styles.resultCount}>{totalMatches} results found</div>
          {totalMatches === 0 ? (
            <div className={styles.empty}>No results found</div>
          ) : (
            results.map((group) => (
              <div key={group.phaseId} className={styles.group}>
                <div className={styles.groupTitle}>Phase {group.phaseId}: {group.phaseName}</div>
                <ul className={styles.list}>
                  {group.matches.map((match, index) => (
                    <li key={`${match.type}-${index}`} className={styles.listItem}>
                      <button
                        type="button"
                        className={styles.resultButton}
                        onClick={() => handleSelect(match)}
                      >
                        <div className={styles.resultLabel}>
                          {highlightText(match.label, debouncedQuery)}
                        </div>
                        <div className={styles.resultSnippet}>
                          {highlightText(match.snippet, debouncedQuery)}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
