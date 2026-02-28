/**
 * Thingstead Governance Kernel — Action queue with conflict detection.
 *
 * Provides an ordered, deterministic action queue for agent operations.
 * Each action gets a monotonic sequence number and is checked for conflicts
 * before being accepted.
 *
 * Queue semantics:
 * - Actions are submitted with a target artifact revision
 * - If the revision is stale (artifact was modified since), the action is rejected
 * - Accepted actions are processed in sequence order
 * - The queue supports back-pressure via configurable depth limits
 */

import { randomUUID } from "../utils/uuid.js";

// ---------------------------------------------------------------------------
// Queue entry states
// ---------------------------------------------------------------------------

export const QueueEntryStatus = Object.freeze({
  PENDING: "pending",
  ACCEPTED: "accepted",
  REJECTED: "rejected",
  SUPERSEDED: "superseded",
});

// ---------------------------------------------------------------------------
// Action queue (pure data structure — no side effects)
// ---------------------------------------------------------------------------

/**
 * Creates a new empty action queue.
 *
 * @param {Object} [options]
 * @param {number} [options.maxDepth=100] - Maximum pending actions before back-pressure.
 * @returns {Object} Queue state.
 */
export function createQueue(options = {}) {
  return {
    entries: [],
    nextSequence: 0,
    maxDepth: options.maxDepth || 100,
  };
}

/**
 * Submits an action to the queue.
 *
 * @param {Object} queue - The current queue state.
 * @param {Object} action - The action to submit.
 * @param {string} action.agentId - The submitting agent.
 * @param {string} action.type - Action type (e.g., "SUBMIT_ADVISORY", "HEARTBEAT").
 * @param {string} [action.targetArtifactId] - Target artifact ID for conflict detection.
 * @param {number} [action.expectedRevision] - Expected artifact revision for optimistic locking.
 * @param {*} action.payload - Action-specific data.
 * @param {Object} [revisions] - Current artifact revision map { [artifactId]: number }.
 * @returns {{ queue: Object, entry: Object, backPressure: boolean }}
 */
export function submitAction(queue, action, revisions = {}) {
  const pendingCount = queue.entries.filter((e) => e.status === QueueEntryStatus.PENDING).length;
  const backPressure = pendingCount >= queue.maxDepth;

  const entry = {
    id: randomUUID(),
    sequence: queue.nextSequence,
    agentId: action.agentId || "unknown",
    type: action.type,
    targetArtifactId: action.targetArtifactId || null,
    expectedRevision: action.expectedRevision ?? null,
    payload: action.payload || {},
    status: QueueEntryStatus.PENDING,
    submittedAt: new Date().toISOString(),
    resolvedAt: null,
  };

  // Optimistic locking: reject if the artifact revision has moved.
  if (entry.targetArtifactId && entry.expectedRevision !== null) {
    const currentRevision = revisions[entry.targetArtifactId];
    if (currentRevision !== undefined && currentRevision !== entry.expectedRevision) {
      entry.status = QueueEntryStatus.REJECTED;
      entry.resolvedAt = entry.submittedAt;
    }
  }

  // Supersede earlier pending entries targeting the same artifact from the same agent.
  const updatedEntries = queue.entries.map((existing) => {
    if (
      existing.status === QueueEntryStatus.PENDING &&
      existing.agentId === entry.agentId &&
      existing.targetArtifactId === entry.targetArtifactId &&
      entry.targetArtifactId !== null
    ) {
      return { ...existing, status: QueueEntryStatus.SUPERSEDED, resolvedAt: entry.submittedAt };
    }
    return existing;
  });

  return {
    queue: {
      ...queue,
      entries: [...updatedEntries, entry],
      nextSequence: queue.nextSequence + 1,
    },
    entry,
    backPressure,
  };
}

/**
 * Processes the next pending action in the queue.
 * Returns the entry to be processed, or null if the queue is empty.
 *
 * @param {Object} queue - The current queue state.
 * @returns {{ queue: Object, entry: Object|null }}
 */
export function processNext(queue) {
  const pendingIndex = queue.entries.findIndex((e) => e.status === QueueEntryStatus.PENDING);
  if (pendingIndex === -1) return { queue, entry: null };

  const entry = queue.entries[pendingIndex];
  const resolved = { ...entry, status: QueueEntryStatus.ACCEPTED, resolvedAt: new Date().toISOString() };
  const updatedEntries = queue.entries.slice();
  updatedEntries[pendingIndex] = resolved;

  return {
    queue: { ...queue, entries: updatedEntries },
    entry: resolved,
  };
}

/**
 * Returns queue statistics.
 *
 * @param {Object} queue - The queue state.
 * @returns {{ total: number, pending: number, accepted: number, rejected: number, superseded: number }}
 */
export function queueStats(queue) {
  const entries = queue?.entries || [];
  return {
    total: entries.length,
    pending: entries.filter((e) => e.status === QueueEntryStatus.PENDING).length,
    accepted: entries.filter((e) => e.status === QueueEntryStatus.ACCEPTED).length,
    rejected: entries.filter((e) => e.status === QueueEntryStatus.REJECTED).length,
    superseded: entries.filter((e) => e.status === QueueEntryStatus.SUPERSEDED).length,
  };
}

/**
 * Compacts the queue by removing resolved entries older than the given threshold.
 *
 * @param {Object} queue - The queue state.
 * @param {number} [maxResolved=50] - Maximum resolved entries to retain.
 * @returns {Object} Compacted queue.
 */
export function compactQueue(queue, maxResolved = 50) {
  const pending = queue.entries.filter((e) => e.status === QueueEntryStatus.PENDING);
  const resolved = queue.entries.filter((e) => e.status !== QueueEntryStatus.PENDING);
  const trimmedResolved = resolved.length > maxResolved
    ? resolved.slice(resolved.length - maxResolved)
    : resolved;

  return {
    ...queue,
    entries: [...trimmedResolved, ...pending],
  };
}
