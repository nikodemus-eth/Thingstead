/**
 * OpenClaw × Thingstead bridge utilities.
 * Thin fetch wrappers for the /api/openclaw/* routes.
 * All functions are silent-fail — return null or { ok: false } on error.
 * Never throw; callers can always fall back to project.openclaw from the prop.
 */

const API = "/api/openclaw";

/**
 * Fetch the openclaw metadata block for a project.
 * @param {string} projectId
 * @returns {Promise<{linkedAgentIds: string[], lastAgentHeartbeat: string|null, advisoryDrafts: object}|null>}
 */
export async function fetchOpenClawAgents(projectId) {
  try {
    const res = await fetch(`${API}/projects/${encodeURIComponent(projectId)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.project?.openclaw ?? null;
  } catch {
    return null;
  }
}

/**
 * Submit an advisory draft proposal for a project artifact.
 * @param {{ projectId: string, draftId: string, content: string }} opts
 * @returns {Promise<{ok: true, draftId: string}|{ok: false}>}
 */
export async function quickPropose({ projectId, draftId, content }) {
  try {
    const res = await fetch(`${API}/proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, draftId, content }),
    });
    if (!res.ok) return { ok: false };
    return await res.json();
  } catch {
    return { ok: false };
  }
}

/**
 * Query the advisory gate readiness for a project phase.
 * @param {string} projectId
 * @param {number} phaseNumber
 * @returns {Promise<{ready: boolean, advisory: true, phaseNumber: number}|null>}
 */
export async function analyzeGate(projectId, phaseNumber = 1) {
  try {
    const res = await fetch(
      `${API}/gate/${encodeURIComponent(projectId)}/${encodeURIComponent(phaseNumber)}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
