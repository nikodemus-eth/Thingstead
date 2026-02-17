let cachedAvailable = null;
let cachedAt = 0;

// Avoid "sticky disconnected" when the backend comes up after the first probe.
const AVAILABILITY_TTL_MS = 3000;

async function checkAvailable() {
  // Deterministic escape hatch for tests and local-only workflows.
  // - Query param: ?disableLanSync=1
  // - localStorage flag: thingstead:disableLanSync=1
  try {
    if (typeof location !== "undefined") {
      const sp = new URLSearchParams(location.search || "");
      if (sp.get("disableLanSync") === "1") return false;
    }
    if (typeof localStorage !== "undefined") {
      if (localStorage.getItem("thingstead:disableLanSync") === "1") return false;
    }
  } catch {
    // Ignore and continue with availability check.
  }

  const now = Date.now();
  if (cachedAvailable !== null && now - cachedAt < AVAILABILITY_TTL_MS) {
    return cachedAvailable;
  }
  try {
    const res = await fetch("/api/health", { method: "GET" });
    cachedAvailable = res.ok;
  } catch {
    cachedAvailable = false;
  }
  cachedAt = now;
  return cachedAvailable;
}

export async function fetchRemoteIndex() {
  const ok = await checkAvailable();
  if (!ok) return null;
  try {
    const res = await fetch("/api/projects", { method: "GET" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchRemoteProject(projectId) {
  const ok = await checkAvailable();
  if (!ok) return null;
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: "GET",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.project || null;
  } catch {
    return null;
  }
}

export async function upsertRemoteProject(project) {
  const ok = await checkAvailable();
  if (!ok) return null;
  const id = project?.id;
  if (typeof id !== "string" || id.length === 0) return null;
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function deleteRemoteProject(projectId) {
  const ok = await checkAvailable();
  if (!ok) return null;
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: "DELETE",
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
