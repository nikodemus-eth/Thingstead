import { promises as fsp } from "node:fs";
import path from "node:path";

const TOLERANCE_MS = 2000;

/**
 * Determines whether an incoming write should be accepted based on timestamps.
 * Returns true if:
 *   - No existing project (first write)
 *   - No incoming timestamp (permissive fallback)
 *   - Incoming timestamp is newer than, equal to, or within TOLERANCE_MS of existing
 */
export function shouldAcceptWrite(existingLastModified, incomingLastModified) {
  if (!existingLastModified) return true;
  if (!incomingLastModified) return true;

  const existing = new Date(existingLastModified).getTime();
  const incoming = new Date(incomingLastModified).getTime();

  if (Number.isNaN(existing) || Number.isNaN(incoming)) return true;

  // Accept if incoming is newer, equal, or within tolerance window
  return incoming >= existing - TOLERANCE_MS;
}

/**
 * Rebuilds a project index by scanning a directory for JSON project files.
 * Returns { currentProjectId: null, projects: { [id]: summary } }.
 * Each summary contains id, name, lastModified, and lastSavedFrom (when present).
 */
export async function rebuildIndex(projectsDir) {
  const projects = {};
  let files;
  try {
    files = await fsp.readdir(projectsDir);
  } catch {
    return { currentProjectId: null, projects };
  }
  for (const file of files) {
    if (!file.endsWith(".json")) continue;
    const id = file.slice(0, -5);
    try {
      const raw = await fsp.readFile(path.join(projectsDir, file), "utf8");
      const project = JSON.parse(raw);
      if (!project || typeof project !== "object") continue;
      projects[id] = {
        id: typeof project.id === "string" ? project.id : id,
        name: typeof project.name === "string" ? project.name : id,
        lastModified: typeof project.lastModified === "string" ? project.lastModified : null,
        lastSavedFrom: typeof project.lastSavedFrom === "string" ? project.lastSavedFrom : null,
      };
    } catch {
      // skip corrupt files
    }
  }
  return { currentProjectId: null, projects };
}
