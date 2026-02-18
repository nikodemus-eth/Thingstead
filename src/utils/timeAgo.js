/**
 * Formats an ISO 8601 timestamp as a human-readable relative time string.
 * @param {string | null | undefined} isoTimestamp
 * @returns {string}
 */
export function timeAgo(isoTimestamp) {
  if (!isoTimestamp || typeof isoTimestamp !== "string") return "never";
  const then = new Date(isoTimestamp).getTime();
  if (Number.isNaN(then)) return "unknown";
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 5) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}
