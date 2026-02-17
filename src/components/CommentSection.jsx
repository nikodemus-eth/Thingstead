import { useState } from "react";
import GlyphIcon from "./GlyphIcon.jsx";
import { randomUUID } from "../utils/uuid.js";
import styles from "./ArtifactList.module.css";

const COMMENT_TYPES = [
  { value: "advisory", label: "Advisory" },
  { value: "self-critique", label: "Self-Critique" },
  { value: "future-review", label: "Future-Review" },
];

function commentTypeGlyph(type) {
  if (type === "future-review") return "review";
  if (type === "self-critique") return "audit";
  return "flag";
}

export default function CommentSection({
  comments,
  actorId,
  onCommentsChange,
}) {
  const [commentType, setCommentType] = useState("advisory");
  const [commentContent, setCommentContent] = useState("");
  const [commentError, setCommentError] = useState("");

  const sortedComments = [...(comments || [])].sort((a, b) =>
    (b.created_at || "").localeCompare(a.created_at || "")
  );

  const handleAdd = () => {
    const content = commentContent.trim();
    if (!content) {
      setCommentError("Comment content is required.");
      return;
    }

    const nextComments = (comments || []).concat({
      id: randomUUID(),
      comment_type: commentType,
      content,
      status: "open",
      created_at: new Date().toISOString(),
      created_by: actorId,
      resolved_at: null,
      resolved_by: null,
    });

    onCommentsChange(nextComments);
    setCommentContent("");
    setCommentError("");
  };

  const handleResolveToggle = (commentId) => {
    const nextComments = (comments || []).map((comment) => {
      if (comment.id !== commentId) return comment;
      const resolved = comment.status === "resolved";
      return {
        ...comment,
        status: resolved ? "open" : "resolved",
        resolved_at: resolved ? null : new Date().toISOString(),
        resolved_by: resolved ? null : actorId,
      };
    });

    onCommentsChange(nextComments);
  };

  return (
    <div className={styles.comments}>
      <div className={styles.commentsTitle}>
        <GlyphIcon name="review" size={14} />
        Comments
      </div>
      {sortedComments.length === 0 ? (
        <div className={styles.empty}>No comments yet.</div>
      ) : (
        <ul className={styles.commentList}>
          {sortedComments.map((comment) => (
            <li key={comment.id} className={styles.commentItem}>
              <div className={styles.commentHeader}>
                <span className={styles.commentType}>
                  <GlyphIcon
                    name={commentTypeGlyph(comment.comment_type)}
                    size={10}
                  />
                  {comment.comment_type}
                </span>
                <span
                  className={
                    comment.status === "resolved"
                      ? styles.commentStatusResolved
                      : styles.commentStatusOpen
                  }
                >
                  <GlyphIcon
                    name={comment.status === "resolved" ? "check" : "pending"}
                    size={10}
                  />
                  {comment.status}
                </span>
              </div>
              <div className={styles.commentContent}>{comment.content}</div>
              <div className={styles.commentMeta}>
                {comment.created_by} •{" "}
                {new Date(comment.created_at).toLocaleString()}
              </div>
              <button
                type="button"
                className={styles.commentAction}
                onClick={() => handleResolveToggle(comment.id)}
              >
                <GlyphIcon
                  name={comment.status === "resolved" ? "direct" : "check"}
                  size={12}
                />
                {comment.status === "resolved" ? "Reopen" : "Resolve"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.commentComposer}>
        <label htmlFor="comment-type">Comment type</label>
        <select
          id="comment-type"
          value={commentType}
          onChange={(event) => setCommentType(event.target.value)}
        >
          {COMMENT_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        <label htmlFor="comment-content">Comment</label>
        <textarea
          id="comment-content"
          value={commentContent}
          onChange={(event) => {
            setCommentContent(event.target.value);
            if (commentError) setCommentError("");
          }}
        />
        {commentError && (
          <div className={styles.commentError}>{commentError}</div>
        )}
        <button
          type="button"
          className={styles.commentAdd}
          onClick={handleAdd}
        >
          <GlyphIcon name="add" size={12} />
          Add Comment
        </button>
      </div>
    </div>
  );
}
