import { useCallback, useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import styles from "./MarkdownEditor.module.css";

const TOOLBAR_ACTIONS = [
  { label: "Bold", wrap: "**", shortcut: "Ctrl+B", key: "b" },
  { label: "Italic", wrap: "*", shortcut: "Ctrl+I", key: "i" },
  { label: "Heading", prefix: "# ", shortcut: "Ctrl+H", key: "h" },
  { label: "Link", insert: "[text](url)", shortcut: "Ctrl+K", key: "k" },
  { label: "List", prefix: "- ", shortcut: "Ctrl+L", key: "l" },
  { label: "Code", block: "```\ncode\n```", shortcut: "Ctrl+E", key: "e" },
];

const SHORTCUT_MAP = Object.fromEntries(
  TOOLBAR_ACTIONS.map((action) => [action.key, action])
);

function applyAction(textarea, action, value, onChange) {
  if (!textarea) return;
  const start = textarea.selectionStart ?? 0;
  const end = textarea.selectionEnd ?? 0;
  const selected = value.slice(start, end);

  let nextValue = value;
  let cursorStart = start;
  let cursorEnd = end;

  if (action.wrap) {
    const wrapped = `${action.wrap}${selected || "text"}${action.wrap}`;
    nextValue = value.slice(0, start) + wrapped + value.slice(end);
    cursorStart = start + action.wrap.length;
    cursorEnd = start + wrapped.length - action.wrap.length;
  } else if (action.prefix) {
    const prefix = action.prefix;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    nextValue = value.slice(0, lineStart) + prefix + value.slice(lineStart);
    cursorStart = start + prefix.length;
    cursorEnd = end + prefix.length;
  } else if (action.block) {
    const block = action.block;
    nextValue = value.slice(0, start) + block + value.slice(end);
    cursorStart = start + block.length;
    cursorEnd = cursorStart;
  } else if (action.insert) {
    const insert = action.insert;
    nextValue = value.slice(0, start) + insert + value.slice(end);
    cursorStart = start + insert.length;
    cursorEnd = cursorStart;
  }

  onChange(nextValue);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(cursorStart, cursorEnd);
  });
}

export default function MarkdownEditor({ value, onChange, placeholder }) {
  const [previewHtml, setPreviewHtml] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const raw = marked.parse(value || "");
      const clean = DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
      setPreviewHtml(clean);
    }, 500);

    return () => clearTimeout(timer);
  }, [value]);

  const handleKeyDown = useCallback(
    (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      const action = SHORTCUT_MAP[event.key.toLowerCase()];
      if (!action) return;
      event.preventDefault();
      applyAction(textareaRef.current, action, value || "", onChange);
    },
    [value, onChange]
  );

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        {TOOLBAR_ACTIONS.map((action) => (
          <button
            key={action.label}
            type="button"
            className={styles.toolbarButton}
            onClick={() =>
              applyAction(textareaRef.current, action, value || "", onChange)
            }
          >
            {action.label}
          </button>
        ))}
        <div className={styles.shortcutHint}>
          Shortcuts: {TOOLBAR_ACTIONS.map((action) => action.shortcut).join(", ")}
        </div>
      </div>
      <div className={styles.splitView}>
        <textarea
          ref={textareaRef}
          className={styles.editor}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
        <div
          className={styles.preview}
          dangerouslySetInnerHTML={{ __html: previewHtml }}
        />
      </div>
    </div>
  );
}
