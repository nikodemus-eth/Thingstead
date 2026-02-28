/**
 * Thingstead Server — Agent optimistic locking.
 *
 * Provides per-artifact revision tracking and conflict detection
 * for concurrent agent writes. Uses optimistic locking: agents
 * submit their expected revision with each write, and the server
 * rejects stale writes.
 *
 * In-memory only (state is lost on restart). This is acceptable
 * because advisory drafts are non-critical and agents re-submit.
 */

// ---------------------------------------------------------------------------
// Revision tracker (in-memory, per-project)
// ---------------------------------------------------------------------------

const projectRevisions = new Map();

/**
 * Gets the current revision for an artifact.
 *
 * @param {string} projectId
 * @param {string} artifactId
 * @returns {number} Current revision (0 if never touched).
 */
export function getRevision(projectId, artifactId) {
  const revisions = projectRevisions.get(projectId);
  if (!revisions) return 0;
  return revisions.get(artifactId) || 0;
}

/**
 * Gets all artifact revisions for a project.
 *
 * @param {string} projectId
 * @returns {Object} Map of { [artifactId]: revision }.
 */
export function getAllRevisions(projectId) {
  const revisions = projectRevisions.get(projectId);
  if (!revisions) return {};
  return Object.fromEntries(revisions);
}

/**
 * Attempts to increment the revision for an artifact.
 * Returns success/failure based on optimistic locking.
 *
 * @param {string} projectId
 * @param {string} artifactId
 * @param {number} expectedRevision - The revision the caller expects.
 * @returns {{ ok: boolean, currentRevision: number }}
 */
export function tryIncrementRevision(projectId, artifactId, expectedRevision) {
  if (!projectRevisions.has(projectId)) {
    projectRevisions.set(projectId, new Map());
  }
  const revisions = projectRevisions.get(projectId);
  const current = revisions.get(artifactId) || 0;

  if (current !== expectedRevision) {
    return { ok: false, currentRevision: current };
  }

  revisions.set(artifactId, current + 1);
  return { ok: true, currentRevision: current + 1 };
}

/**
 * Resets all revisions for a project (e.g., on project reload).
 *
 * @param {string} projectId
 */
export function resetProjectRevisions(projectId) {
  projectRevisions.delete(projectId);
}

/**
 * Returns per-agent heartbeat tracking for a project.
 * Used for detecting stale agents.
 */
const agentHeartbeats = new Map();

/**
 * Records an agent heartbeat.
 *
 * @param {string} projectId
 * @param {string} agentId
 * @returns {{ lastHeartbeat: string, agentCount: number }}
 */
export function recordHeartbeat(projectId, agentId) {
  if (!agentHeartbeats.has(projectId)) {
    agentHeartbeats.set(projectId, new Map());
  }
  const agents = agentHeartbeats.get(projectId);
  const now = new Date().toISOString();
  agents.set(agentId, now);

  return {
    lastHeartbeat: now,
    agentCount: agents.size,
  };
}

/**
 * Gets the heartbeat map for a project.
 *
 * @param {string} projectId
 * @returns {Object} Map of { [agentId]: lastHeartbeatISO }.
 */
export function getAgentHeartbeats(projectId) {
  const agents = agentHeartbeats.get(projectId);
  if (!agents) return {};
  return Object.fromEntries(agents);
}

/**
 * Identifies agents whose last heartbeat is older than the given threshold.
 *
 * @param {string} projectId
 * @param {number} staleMs - Milliseconds after which an agent is considered stale.
 * @returns {string[]} Array of stale agent IDs.
 */
export function findStaleAgents(projectId, staleMs = 60000) {
  const agents = agentHeartbeats.get(projectId);
  if (!agents) return [];
  const now = Date.now();
  const stale = [];
  for (const [agentId, lastBeat] of agents) {
    if (now - new Date(lastBeat).getTime() > staleMs) {
      stale.push(agentId);
    }
  }
  return stale;
}
