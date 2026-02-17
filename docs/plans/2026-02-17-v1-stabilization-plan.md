# v1.x Stabilization & Hardening Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert v0.9.x into a production-grade deterministic governance engine with schema migration, conflict detection, full WCAG AA, and formal documentation.

**Architecture:** Data-first ordering. Schema migration framework wraps existing normalizeProject.js into a chained migrator pattern. LAN sync gains timestamp-based conflict detection. WCAG AA is wired through existing `:focus-visible` and `prefers-reduced-motion` foundations. All work tested via Vitest + Playwright.

**Tech Stack:** React 19, Vite (rolldown-vite 7.2.5), Vitest 4.x, Playwright 1.58, CSS Modules, Node.js server (server/server.mjs)

**Test commands:**
- Unit: `npx vitest --run`
- Lint: `npx eslint .`
- E2E: `npx playwright test`
- Build: `npm run build`

---

## Part A — Data Integrity Hardening

### Task 1: Schema Migration Orchestrator

**Files:**
- Create: `src/migrations/index.js`
- Create: `src/migrations/index.test.js`
- Reference: `src/utils/normalizeProject.js` (existing, read-only for now)

**Step 1: Write the failing test**

```js
// src/migrations/index.test.js
import { describe, it, expect } from "vitest";
import { migrateProject, CURRENT_SCHEMA_VERSION } from "./index.js";

describe("migrateProject", () => {
  it("returns null for non-object input", () => {
    expect(migrateProject(null)).toEqual(null);
    expect(migrateProject("string")).toEqual(null);
  });

  it("migrates a v0 project (no schema_version) to current", () => {
    const v0 = { id: "test-1", name: "Legacy", phases: [] };
    const result = migrateProject(v0);
    expect(result.meta.schema_version).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("migrates a v0 project with legacy schemaVersion number", () => {
    const v0 = { id: "test-2", name: "Old", schemaVersion: 1, phases: [] };
    const result = migrateProject(v0);
    expect(result.meta.schema_version).toBe(CURRENT_SCHEMA_VERSION);
  });

  it("returns project unchanged if already at current version", () => {
    const current = {
      id: "test-3",
      name: "Current",
      meta: { schema_version: CURRENT_SCHEMA_VERSION },
      phases: [],
    };
    const result = migrateProject(current);
    expect(result.meta.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    expect(result.id).toBe("test-3");
  });

  it("detects version and returns migrated_from metadata", () => {
    const v0 = { id: "test-4", name: "Track", phases: [] };
    const result = migrateProject(v0);
    expect(result.meta.migrated_from).toBe("0");
  });

  it("does not set migrated_from if project was already current", () => {
    const current = {
      id: "test-5",
      name: "NoMigrate",
      meta: { schema_version: CURRENT_SCHEMA_VERSION },
      phases: [],
    };
    const result = migrateProject(current);
    expect(result.meta.migrated_from).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest --run src/migrations/index.test.js`
Expected: FAIL — module not found

**Step 3: Write minimal implementation**

```js
// src/migrations/index.js
import { normalizeProject } from "../utils/normalizeProject.js";

export const CURRENT_SCHEMA_VERSION = "1";

const MIGRATORS = [
  { from: "0", to: "1", migrate: normalizeProject },
];

function detectVersion(project) {
  if (project?.meta?.schema_version) return project.meta.schema_version;
  if (typeof project?.schema_version === "string") return project.schema_version;
  if (typeof project?.schemaVersion === "number") return String(project.schemaVersion);
  return "0";
}

export function migrateProject(project) {
  if (!project || typeof project !== "object") return null;

  const sourceVersion = detectVersion(project);
  if (sourceVersion === CURRENT_SCHEMA_VERSION) {
    // Already current — run normalization for safety but don't mark as migrated.
    const normalized = normalizeProject(project);
    return normalized;
  }

  let current = project;
  let version = sourceVersion;

  for (const step of MIGRATORS) {
    if (step.from === version) {
      current = step.migrate(current);
      version = step.to;
    }
  }

  // Stamp final version and migration metadata.
  return {
    ...current,
    meta: {
      ...(current.meta || {}),
      schema_version: CURRENT_SCHEMA_VERSION,
      migrated_from: sourceVersion,
    },
  };
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest --run src/migrations/index.test.js`
Expected: PASS (6 tests)

**Step 5: Commit**

```
feat: add schema migration orchestrator with chained migrator pattern
```

---

### Task 2: Wire Migration Into Storage Load Path

**Files:**
- Modify: `src/utils/storage.js` — wrap `loadProject` with migration
- Modify: `src/utils/storage.test.js` — add migration integration test
- Modify: `src/utils/importExport.js` — use migrateProject instead of direct normalizeProject

**Step 1: Write the failing test**

Add to `src/utils/storage.test.js`:

```js
import { migrateProject, CURRENT_SCHEMA_VERSION } from "../migrations/index.js";

describe("loadProject with migration", () => {
  it("returns migrated project data when loading a legacy project", () => {
    const legacy = { current: { id: "legacy-1", name: "Old", phases: [] }, history: [], historyIndex: -1 };
    localStorage.setItem("cpmai-project-legacy-1", JSON.stringify(legacy));
    const result = loadProject("legacy-1");
    expect(result.current.meta.schema_version).toBe(CURRENT_SCHEMA_VERSION);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest --run src/utils/storage.test.js`
Expected: FAIL — loadProject doesn't migrate

**Step 3: Modify loadProject in storage.js**

In `src/utils/storage.js`, add import and wrap `loadProject`:

```js
import { migrateProject } from "../migrations/index.js";

export function loadProject(projectId) {
  const key = `cpmai-project-${projectId}`;
  const data = safeGetItem(key);
  if (!data || !data.current) return data;
  const migrated = migrateProject(data.current);
  if (migrated) {
    return { ...data, current: migrated };
  }
  return data;
}
```

Similarly update `importProject` in `src/utils/importExport.js` to use `migrateProject` instead of `normalizeProject` directly for the final project output.

**Step 4: Run tests**

Run: `npx vitest --run`
Expected: ALL PASS

**Step 5: Commit**

```
feat: wire schema migration into storage load and import paths
```

---

### Task 3: Export Backward Compatibility — minReaderVersion + Round-Trip Test

**Files:**
- Modify: `src/utils/exportBundle.js` — add `minReaderVersion` to bundle
- Create: `src/utils/exportRoundTrip.test.js` — round-trip test
- Reference: `src/utils/importExport.js`

**Step 1: Write the failing test**

```js
// src/utils/exportRoundTrip.test.js
import { describe, it, expect } from "vitest";
import { buildExportBundle, importProject } from "./importExport.js";
import { CURRENT_SCHEMA_VERSION } from "../migrations/index.js";

describe("export/import round-trip", () => {
  it("round-trips a legacy project through export then import", async () => {
    const legacy = {
      id: "rt-1",
      name: "Round Trip",
      phases: [{ id: 1, phase_number: 1, name: "Phase 1", artifacts: [] }],
    };
    const bundle = await buildExportBundle(legacy);
    expect(bundle.minReaderVersion).toBe(CURRENT_SCHEMA_VERSION);
    const jsonString = JSON.stringify(bundle);
    const result = importProject(jsonString, {});
    expect(result.status).toBe("success");
    expect(result.project.meta.schema_version).toBe(CURRENT_SCHEMA_VERSION);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest --run src/utils/exportRoundTrip.test.js`
Expected: FAIL — `minReaderVersion` undefined

**Step 3: Add minReaderVersion to exportBundle.js**

In `src/utils/exportBundle.js`, in the `wrapProjectInBundle` function, add:

```js
import { CURRENT_SCHEMA_VERSION } from "../migrations/index.js";

// Inside wrapProjectInBundle:
minReaderVersion: CURRENT_SCHEMA_VERSION,
```

**Step 4: Run tests**

Run: `npx vitest --run`
Expected: ALL PASS

**Step 5: Commit**

```
feat: add minReaderVersion to export bundle and round-trip test
```

---

### Task 4: Corruption Detection — Integrity Verification on Load

**Files:**
- Modify: `src/utils/projectIntegrity.js` — add `verifyProjectIntegrity` function
- Create: `src/utils/projectIntegrity.verify.test.js` — tests for verification
- Reference: `src/utils/canonicalJson.js`, `src/utils/templateHash.js`

**Step 1: Write the failing test**

```js
// src/utils/projectIntegrity.verify.test.js
import { describe, it, expect } from "vitest";
import { computeProjectIntegrity, verifyProjectIntegrity } from "./projectIntegrity.js";

describe("verifyProjectIntegrity", () => {
  const validProject = {
    id: "v-1",
    name: "Verified",
    meta: { schema_version: "1" },
    phases: [
      {
        id: 1,
        phase_number: 1,
        name: "P1",
        artifacts: [{ id: "a1", name: "Art1" }],
      },
    ],
  };

  it("returns ok:true for a project with valid integrity hash", () => {
    const integrity = computeProjectIntegrity(validProject);
    const withIntegrity = { ...validProject, integrity };
    const result = verifyProjectIntegrity(withIntegrity);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("returns ok:false when integrity hash is tampered", () => {
    const integrity = computeProjectIntegrity(validProject);
    const tampered = { ...validProject, name: "Tampered", integrity };
    const result = verifyProjectIntegrity(tampered);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("hash"))).toBe(true);
  });

  it("returns ok:true (with warning) when no integrity field exists", () => {
    const result = verifyProjectIntegrity(validProject);
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.includes("integrity"))).toBe(true);
  });

  it("detects duplicate phase IDs", () => {
    const dup = {
      ...validProject,
      phases: [
        { id: 1, phase_number: 1, name: "P1", artifacts: [] },
        { id: 1, phase_number: 2, name: "P2", artifacts: [] },
      ],
    };
    const result = verifyProjectIntegrity(dup);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("phase"))).toBe(true);
  });

  it("detects duplicate artifact IDs across phases", () => {
    const dup = {
      ...validProject,
      phases: [
        { id: 1, phase_number: 1, name: "P1", artifacts: [{ id: "a1", name: "Art1" }] },
        { id: 2, phase_number: 2, name: "P2", artifacts: [{ id: "a1", name: "Art2" }] },
      ],
    };
    const result = verifyProjectIntegrity(dup);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("artifact"))).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest --run src/utils/projectIntegrity.verify.test.js`
Expected: FAIL — `verifyProjectIntegrity` not exported

**Step 3: Implement verifyProjectIntegrity**

Add to `src/utils/projectIntegrity.js`:

```js
export function verifyProjectIntegrity(project) {
  const errors = [];
  const warnings = [];

  if (!project || typeof project !== "object") {
    return { ok: false, errors: ["Project is not an object."], warnings };
  }

  // 1. Hash verification
  if (project.integrity?.hash) {
    const recomputed = computeProjectIntegrity(project);
    if (recomputed.hash !== project.integrity.hash) {
      errors.push(`Integrity hash mismatch: expected ${project.integrity.hash}, got ${recomputed.hash}. Project may have been modified outside Thingstead.`);
    }
  } else {
    warnings.push("No integrity hash found. Cannot verify project authenticity.");
  }

  // 2. Phase ID uniqueness
  const phaseIds = new Set();
  for (const phase of project.phases || []) {
    if (phaseIds.has(phase.id)) {
      errors.push(`Duplicate phase ID: ${phase.id}`);
    }
    phaseIds.add(phase.id);
  }

  // 3. Artifact ID uniqueness across project
  const artifactIds = new Set();
  for (const phase of project.phases || []) {
    for (const artifact of phase.artifacts || []) {
      if (artifactIds.has(artifact.id)) {
        errors.push(`Duplicate artifact ID across phases: ${artifact.id}`);
      }
      artifactIds.add(artifact.id);
    }
  }

  // 4. Gate decision validity
  for (const phase of project.phases || []) {
    const decision = phase.goNoGoDecision;
    if (decision && (decision.status === "go" || decision.status === "no-go")) {
      if (!decision.decidedAt) {
        errors.push(`Phase ${phase.id} has ${decision.status} decision without decidedAt timestamp.`);
      }
    }
  }

  // 5. Waiver rationale length
  for (const phase of project.phases || []) {
    for (const artifact of phase.artifacts || []) {
      if (artifact.waiver?.waived && typeof artifact.waiver.rationale === "string") {
        if (artifact.waiver.rationale.replace(/\s+/g, "").length < 20) {
          warnings.push(`Artifact "${artifact.name || artifact.id}" has a short waiver rationale (< 20 non-whitespace chars).`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
```

**Step 4: Run tests**

Run: `npx vitest --run`
Expected: ALL PASS

**Step 5: Commit**

```
feat: add project integrity verification with hash, uniqueness, and gate checks
```

---

### Task 5: Snapshot Integrity Guard

**Files:**
- Modify: `src/state/projectReducer.js` — guard `createSnapshot` against corrupt state
- Modify: `src/state/projectReducer.test.js` — add snapshot guard test

**Step 1: Write the failing test**

Add to `src/state/projectReducer.test.js`:

```js
describe("createSnapshot with integrity guard", () => {
  it("skips snapshot if project has duplicate artifact IDs", () => {
    const corruptProject = {
      id: "corrupt",
      name: "Bad",
      phases: [
        { id: 1, artifacts: [{ id: "dup" }, { id: "dup" }] },
      ],
    };
    const state = {
      currentProject: corruptProject,
      history: [],
      historyIndex: -1,
    };
    const result = createSnapshot(state);
    // Should return state unchanged (no snapshot created)
    expect(result.history.length).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest --run src/state/projectReducer.test.js`
Expected: FAIL — snapshot created despite corruption

**Step 3: Add integrity guard to createSnapshot**

In `src/state/projectReducer.js`, import `verifyProjectIntegrity` and add a guard at the top of `createSnapshot`:

```js
import { verifyProjectIntegrity } from "../utils/projectIntegrity.js";

export function createSnapshot(state) {
  if (!state.currentProject) return state;

  // Guard: don't snapshot corrupt state
  const integrity = verifyProjectIntegrity(state.currentProject);
  if (!integrity.ok) {
    console.warn("[Thingstead] Skipping snapshot: project failed integrity check", integrity.errors);
    return state;
  }

  // ... existing snapshot logic
}
```

**Step 4: Run tests**

Run: `npx vitest --run`
Expected: ALL PASS

**Step 5: Commit**

```
feat: guard undo snapshots against corrupt project state
```

---

## Part B — Backend Discipline

### Task 6: Server Timestamp Conflict Detection

**Files:**
- Modify: `server/server.mjs` — add timestamp comparison on PUT
- Create: `server/server.test.mjs` — server API tests

**Step 1: Write the failing test**

```js
// server/server.test.mjs
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import http from "node:http";
import { promises as fsp } from "node:fs";
import path from "node:path";
import os from "node:os";

// We'll test the server logic directly via HTTP against a temp data dir.
// The server module needs to be importable or we test via fetch against a running instance.
// For simplicity, test the conflict logic as a pure function extracted from server.

import { shouldAcceptWrite } from "../server/conflict.mjs";

describe("shouldAcceptWrite", () => {
  it("accepts when no existing project", () => {
    expect(shouldAcceptWrite(null, "2026-01-01T00:00:00.000Z")).toBe(true);
  });

  it("accepts when incoming is newer", () => {
    expect(shouldAcceptWrite(
      "2026-01-01T00:00:00.000Z",
      "2026-01-02T00:00:00.000Z"
    )).toBe(true);
  });

  it("accepts when timestamps are equal", () => {
    expect(shouldAcceptWrite(
      "2026-01-01T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z"
    )).toBe(true);
  });

  it("accepts within 2-second tolerance window", () => {
    expect(shouldAcceptWrite(
      "2026-01-01T00:00:02.000Z",
      "2026-01-01T00:00:00.500Z"
    )).toBe(true);
  });

  it("rejects when incoming is significantly older", () => {
    expect(shouldAcceptWrite(
      "2026-01-02T00:00:00.000Z",
      "2026-01-01T00:00:00.000Z"
    )).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest --run server/server.test.mjs`
Expected: FAIL — module not found

**Step 3: Create conflict.mjs and wire into server**

```js
// server/conflict.mjs
const TOLERANCE_MS = 2000;

export function shouldAcceptWrite(existingLastModified, incomingLastModified) {
  if (!existingLastModified) return true;
  if (!incomingLastModified) return true;

  const existing = new Date(existingLastModified).getTime();
  const incoming = new Date(incomingLastModified).getTime();

  if (Number.isNaN(existing) || Number.isNaN(incoming)) return true;

  // Accept if incoming is newer, equal, or within tolerance window
  return incoming >= existing - TOLERANCE_MS;
}
```

Then modify `server/server.mjs` PUT handler to:
1. Read existing file's `lastModified` before writing
2. Call `shouldAcceptWrite(existing, incoming)`
3. If rejected: return 409 with `{ error: "CONFLICT", serverProject: existingProject }`

**Step 4: Run tests**

Run: `npx vitest --run`
Expected: ALL PASS

**Step 5: Commit**

```
feat: add timestamp-based conflict detection to LAN sync server
```

---

### Task 7: Client Conflict Handling

**Files:**
- Modify: `src/utils/lanSync.js` — handle 409 response
- Create: `src/components/modals/ConflictModal.jsx` — conflict resolution UI
- Modify: `src/components/ProjectList.jsx` — wire conflict modal

**Step 1: Modify upsertRemoteProject to detect 409**

```js
// In src/utils/lanSync.js — new return shape
export async function upsertRemoteProject(project) {
  const ok = await checkAvailable();
  if (!ok) return { status: "unavailable" };
  const id = project?.id;
  if (typeof id !== "string" || id.length === 0) return { status: "invalid" };
  try {
    const res = await fetch(`/api/projects/${encodeURIComponent(id)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project }),
    });
    if (res.status === 409) {
      const data = await res.json();
      return { status: "conflict", serverProject: data.serverProject };
    }
    if (!res.ok) return { status: "error" };
    return { status: "ok", data: await res.json() };
  } catch {
    return { status: "error" };
  }
}
```

**Step 2: Create ConflictModal**

```jsx
// src/components/modals/ConflictModal.jsx
import GlyphIcon from "../GlyphIcon.jsx";
import styles from "../ProjectList.module.css";

export default function ConflictModal({ projectName, onResolve }) {
  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Sync conflict">
      <div className={styles.modal}>
        <div className={styles.modalTitle}>
          <GlyphIcon name="conflict" size={16} label="Conflict" />
          Sync Conflict
        </div>
        <p>
          The project "{projectName}" was modified on another device since your last sync.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => onResolve("mine")}>Use Mine</button>
          <button type="button" onClick={() => onResolve("theirs")}>Use Theirs</button>
          <button type="button" onClick={() => onResolve("both")}>Keep Both</button>
          <button type="button" onClick={() => onResolve("cancel")}>Cancel</button>
        </div>
      </div>
    </div>
  );
}
```

**Step 3: Wire into ProjectList where upsertRemoteProject is called**

Handle the `{ status: "conflict" }` return by showing ConflictModal. On "mine": force-PUT. On "theirs": load server version. On "both": clone with new UUID.

**Step 4: Run tests**

Run: `npx vitest --run && npx playwright test`
Expected: ALL PASS

**Step 5: Commit**

```
feat: add client-side conflict resolution for LAN sync
```

---

### Task 8: Server Index Rebuild + fsync

**Files:**
- Modify: `server/server.mjs` — add `/api/index/rebuild` endpoint, add fsync
- Add to: `server/server.test.mjs` — test index rebuild

**Step 1: Write failing test**

Add to `server/server.test.mjs`:

```js
import { rebuildIndex } from "../server/conflict.mjs";

describe("rebuildIndex", () => {
  it("returns empty projects for empty directory", async () => {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ts-test-"));
    const result = await rebuildIndex(tmpDir);
    expect(result.projects).toEqual({});
    await fsp.rm(tmpDir, { recursive: true });
  });
});
```

**Step 2-5: Implement, test, commit**

Add `rebuildIndex` to `server/conflict.mjs`. Wire `/api/index/rebuild` GET endpoint in server.mjs. Add `fsp.fdatasync` (via file handle) before rename in `atomicWriteJson`.

```
feat: add server index rebuild endpoint and fsync for write durability
```

---

### Task 9: Client Self-Healing Index + LAN Status Indicator

**Files:**
- Modify: `src/contexts/ProjectContext.jsx` — self-healing index on load
- Create: `src/components/LanStatus.jsx` — status indicator component
- Modify: `src/App.jsx` — render LanStatus

**Step 1: Self-healing logic**

In `ProjectContext.jsx`, after loading index, check each project entry exists locally or remotely. Remove orphans.

**Step 2: LanStatus component**

```jsx
// src/components/LanStatus.jsx
import { useEffect, useState } from "react";
import GlyphIcon from "./GlyphIcon.jsx";
import styles from "./App.module.css";

export default function LanStatus() {
  const [status, setStatus] = useState("unknown"); // connected | disconnected | unknown

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const res = await fetch("/api/health", { method: "GET" });
        if (!cancelled) setStatus(res.ok ? "connected" : "disconnected");
      } catch {
        if (!cancelled) setStatus("disconnected");
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => { cancelled = true; clearInterval(interval); };
  }, []);

  const icon = status === "connected" ? "check" : "warning";
  const label = status === "connected" ? "LAN sync connected" : "LAN sync disconnected (local only)";

  return (
    <span title={label} aria-label={label}>
      <GlyphIcon name={icon} size={12} label={label} />
    </span>
  );
}
```

**Step 3-5: Wire into App header, test, commit**

```
feat: add self-healing index and LAN status indicator
```

---

## Part C — UX Stability (WCAG AA)

### Task 10: useFocusTrap Hook

**Files:**
- Create: `src/hooks/useFocusTrap.js`
- Create: `src/hooks/useFocusTrap.test.js`

**Step 1: Write the failing test**

```js
// src/hooks/useFocusTrap.test.js
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRef } from "react";
import { useFocusTrap } from "./useFocusTrap.js";

describe("useFocusTrap", () => {
  it("exports a function", () => {
    expect(typeof useFocusTrap).toBe("function");
  });
});
```

**Step 2: Implement useFocusTrap**

```js
// src/hooks/useFocusTrap.js
import { useEffect, useRef } from "react";

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useFocusTrap(containerRef, active = true) {
  const previousFocus = useRef(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    previousFocus.current = document.activeElement;

    const container = containerRef.current;
    const focusable = container.querySelectorAll(FOCUSABLE);
    if (focusable.length > 0) focusable[0].focus();

    const handleKeyDown = (e) => {
      if (e.key !== "Tab") return;
      const nodes = container.querySelectorAll(FOCUSABLE);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    container.addEventListener("keydown", handleKeyDown);
    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      if (previousFocus.current instanceof HTMLElement) {
        previousFocus.current.focus();
      }
    };
  }, [containerRef, active]);
}
```

**Step 3-5: Test, commit**

```
feat: add useFocusTrap hook for modal accessibility
```

---

### Task 11: Wire Focus Traps Into All Modals

**Files:**
- Modify: `src/components/modals/CreateModal.jsx`
- Modify: `src/components/modals/DeleteModal.jsx`
- Modify: `src/components/modals/CollisionModal.jsx`
- Modify: `src/components/modals/ShareModal.jsx`

**Step 1-3: Add useFocusTrap to each modal**

In each modal component:
1. Add `const modalRef = useRef(null);`
2. Add `useFocusTrap(modalRef, true);`
3. Add `ref={modalRef}` to the modal container div
4. Ensure the modal container has `role="dialog"` and `aria-modal="true"`

**Step 4: Run E2E tests**

Run: `npx playwright test`
Expected: ALL PASS — verify Escape still works, focus returns on close

**Step 5: Commit**

```
feat: add focus trapping to all modal dialogs
```

---

### Task 12: Skip-to-Content Link + ARIA Landmarks

**Files:**
- Modify: `src/App.jsx` — add skip link, add landmark roles
- Modify: `src/index.css` — add skip link styles

**Step 1: Add skip link and landmarks**

In `src/App.jsx`:
- Before the `<div className={styles.app}>`, add:
```jsx
<a href="#main-content" className="skip-link">Skip to content</a>
```
- Add `id="main-content"` to the `<Motion.main>` element
- Add `role="navigation" aria-label="View switcher"` to the nav div
- Add `role="complementary" aria-label="Project list"` to the sidebar

In `src/index.css`:
```css
.skip-link {
  position: absolute;
  left: -9999px;
  z-index: 999;
  padding: 8px 16px;
  background: var(--ts-accent);
  color: var(--ts-text);
  border-radius: var(--radius-sm);
  text-decoration: none;
  font-weight: 700;
}
.skip-link:focus {
  left: 16px;
  top: 16px;
}
```

**Step 2-5: Test, commit**

```
feat: add skip-to-content link and ARIA landmarks
```

---

### Task 13: PhaseNav Keyboard Navigation (Roving Tabindex)

**Files:**
- Modify: `src/components/PhaseNav.jsx` — add Arrow Left/Right support

**Step 1: Add keyboard handler**

In `PhaseNav.jsx`, add a `handleKeyDown` on the nav container:

```jsx
const handleKeyDown = (e) => {
  const phaseIds = phases.map((p) => p.id);
  const currentIndex = phaseIds.indexOf(currentPhaseId);
  if (currentIndex === -1) return;

  if (e.key === "ArrowRight" || e.key === "ArrowDown") {
    e.preventDefault();
    const next = phaseIds[Math.min(currentIndex + 1, phaseIds.length - 1)];
    onSelectPhase(next);
  }
  if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
    e.preventDefault();
    const prev = phaseIds[Math.max(currentIndex - 1, 0)];
    onSelectPhase(prev);
  }
};
```

Add `role="tablist"` to the nav container, `role="tab"` and `aria-selected` to each button, `tabIndex={phase.id === currentPhaseId ? 0 : -1}` for roving tabindex.

**Step 2-5: Test, commit**

```
feat: add keyboard navigation to phase tabs (Arrow Left/Right)
```

---

### Task 14: Keyboard Shortcut Help Dialog

**Files:**
- Create: `src/components/modals/ShortcutHelpModal.jsx`
- Modify: `src/App.jsx` — add `?` shortcut and modal state

**Step 1: Create ShortcutHelpModal**

```jsx
// src/components/modals/ShortcutHelpModal.jsx
import { useRef } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap.js";
import styles from "../ProjectList.module.css";

const SHORTCUTS = [
  { keys: "Ctrl/Cmd + Z", action: "Undo" },
  { keys: "Ctrl/Cmd + Shift + Z", action: "Redo" },
  { keys: "Escape", action: "Close dialog" },
  { keys: "?", action: "Show this help" },
  { keys: "Arrow Left/Right", action: "Navigate phases" },
];

export default function ShortcutHelpModal({ onClose }) {
  const ref = useRef(null);
  useFocusTrap(ref, true);

  return (
    <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
      <div className={styles.modal} ref={ref}>
        <h2>Keyboard Shortcuts</h2>
        <table>
          <thead><tr><th>Shortcut</th><th>Action</th></tr></thead>
          <tbody>
            {SHORTCUTS.map((s) => (
              <tr key={s.keys}><td><kbd>{s.keys}</kbd></td><td>{s.action}</td></tr>
            ))}
          </tbody>
        </table>
        <button type="button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
```

**Step 2: Wire `?` shortcut in App.jsx keydown handler**

Add before the `isMeta` check:
```js
if (event.key === "?" && !isInput) {
  event.preventDefault();
  setShowShortcutHelp(true);
  return;
}
```

**Step 3-5: Test, commit**

```
feat: add keyboard shortcut help dialog (press ?)
```

---

### Task 15: GlyphIcon aria-labels Audit

**Files:**
- Modify: Multiple component files — add `label` prop to meaningful GlyphIcon usages

**Step 1: Audit all GlyphIcon usages**

Search for `<GlyphIcon` across all files. For each usage that conveys meaning (not purely decorative), add the `label` prop. Examples:

- `<GlyphIcon name="check" size={12} />` in PhaseNav metrics → add `label="Completed"`
- `<GlyphIcon name="lock" size={12} />` in gate status → add `label="Gate locked"`
- `<GlyphIcon name="warning" size={12} />` → add `label="Warning"`

Decorative icons (next to text labels) keep `aria-hidden` (default behavior when no `label` is passed).

**Step 2-5: Apply, test, commit**

```
feat: add aria-labels to meaningful GlyphIcon usages across components
```

---

### Task 16: Live Region for Notices

**Files:**
- Modify: `src/components/ProjectList.jsx` — add `aria-live="polite"` to notice area
- Modify: `src/App.jsx` — add `aria-live` to quota warning

**Step 1: Add aria-live regions**

In ProjectList.jsx, the notice `<div>` at line ~310:
```jsx
<div role="status" aria-live="polite">
  {notice && (
    <div className={notice.type === "error" ? styles.noticeError : styles.noticeSuccess}>
      {notice.message}
    </div>
  )}
</div>
```

In App.jsx, the quota warning:
```jsx
<div role="alert" aria-live="assertive">
  {autoSave?.quotaExceeded && (
    <div className={styles.warning}>
      Storage quota exceeded. Auto-save disabled. Please export your project.
    </div>
  )}
</div>
```

**Step 2-5: Test, commit**

```
feat: add aria-live regions for screen reader announcements
```

---

### Task 17: Semantic HTML + Heading Hierarchy Audit

**Files:**
- Multiple component files — fix semantic issues

**Step 1: Audit and fix**

- Verify all clickable `<div>` elements are actually `<button>` (most are already ✓)
- Verify heading hierarchy: App title should be `<h1>`, section titles `<h2>`, modal titles `<h2>` or `<h3>`
- Verify all lists use `<ul>`/`<li>` (ProjectList already uses `<Motion.ul>`/`<Motion.li>` ✓)
- Add `<nav>` element around view switcher if not already present

**Step 2-5: Apply, test, commit**

```
fix: semantic HTML and heading hierarchy for WCAG compliance
```

---

### Task 18: Framer Motion Reduced Motion + Deterministic Sort

**Files:**
- Modify: `src/components/ProjectList.jsx` — sort projects by lastModified
- Modify: Multiple component files — conditional framer-motion bypass

**Step 1: Deterministic project sort**

In ProjectList.jsx, replace:
```js
const projectList = Object.values(projects);
```
with:
```js
const projectList = Object.values(projects).sort((a, b) => {
  const aTime = a.lastModified ? new Date(a.lastModified).getTime() : 0;
  const bTime = b.lastModified ? new Date(b.lastModified).getTime() : 0;
  return bTime - aTime; // newest first
});
```

**Step 2: Framer motion bypass**

The CSS-level `prefers-reduced-motion` already handles CSS transitions. For framer-motion's JS animations, create a hook:

```js
// src/hooks/useReducedMotion.js
import { useState, useEffect } from "react";

export function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const handler = (e) => setReduced(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return reduced;
}
```

In components using `<Motion.*>`, conditionally disable:
```jsx
const reduced = useReducedMotion();
const motionProps = reduced ? {} : { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.3 } };
```

**Step 3-5: Test, commit**

```
feat: deterministic project sort and framer-motion reduced motion bypass
```

---

### Task 19: Color Contrast Audit

**Files:**
- Modify: `src/styles/theme.css` — fix any contrast violations

**Step 1: Audit all color pairs**

Check contrast ratios for:
- `--ts-text` (#e8e5dc) on `--ts-bg` (#0f0f0f) → ~14.5:1 ✓
- `--ts-text-muted` (#b8b3a7) on `--ts-bg` (#0f0f0f) → ~9.5:1 ✓
- `--ts-text` on `--ts-surface-1` (#1c1c1c) → ~11.5:1 ✓
- `--ts-text` on `--ts-accent` (#3a4a59) → check needed
- `--ts-disabled-text` (#9a9a9a) on `--ts-disabled-bg` (#1a1a1a) → check needed
- Badge text on `--ts-success` / `--ts-warning` / `--ts-danger` backgrounds

Use the formula: contrast = (L1 + 0.05) / (L2 + 0.05) where L is relative luminance.

Fix any pair below 4.5:1 (normal text) or 3:1 (large text, ≥18pt or ≥14pt bold).

**Step 2-5: Fix, test, commit**

```
fix: color contrast adjustments for WCAG AA compliance
```

---

## Part D — Documentation

### Task 20: Expand Schema Contract

**Files:**
- Modify: `docs/SCHEMA_CONTRACT.md`

**Content:** Add field-by-field reference for v1 schema. Document every field on Project, Phase, Artifact, Gate, Waiver, Comment with types, required/optional status, and defaults. Include migration chain documentation and minimal/complete valid project examples.

**Commit:**
```
docs: expand schema contract with full v1 field reference
```

---

### Task 21: Template Registry Spec

**Files:**
- Create: `docs/TEMPLATE_REGISTRY_SPEC.md`

**Content:** Field type definitions, validation rules per type, template binding contract, template hash computation method, how to add new templates.

**Commit:**
```
docs: add template registry specification
```

---

### Task 22: Gate Readiness Rules

**Files:**
- Create: `docs/GATE_RULES.md`

**Content:** Gate readiness computation algorithm, gate-blocking vs non-gate-blocking, waiver semantics, decision lifecycle, solo vs standard mode.

**Commit:**
```
docs: add gate readiness rules documentation
```

---

### Task 23: Governance Modes

**Files:**
- Create: `docs/GOVERNANCE_MODES.md`

**Content:** Standard mode vs solo mode, how mode is set, mutability, impact on templates and gates.

**Commit:**
```
docs: add governance modes documentation
```

---

## Part E — Final Verification

### Task 24: Full Test Suite + Build Verification

**Step 1:** Run full unit tests: `npx vitest --run`
**Step 2:** Run lint: `npx eslint .`
**Step 3:** Run build: `npm run build`
**Step 4:** Run E2E: `npx playwright test`
**Step 5:** Fix any failures
**Step 6:** Final commit

```
chore: v1.0 stabilization complete — all tests pass
```

---

## Task Summary

| # | Area | Description | New Files |
|---|------|-------------|-----------|
| 1 | Data | Schema migration orchestrator | 2 |
| 2 | Data | Wire migration into load/import | 0 |
| 3 | Data | Export backward compat + round-trip test | 1 |
| 4 | Data | Integrity verification on load | 1 |
| 5 | Data | Snapshot integrity guard | 0 |
| 6 | Backend | Server timestamp conflict detection | 2 |
| 7 | Backend | Client conflict handling + modal | 1 |
| 8 | Backend | Server index rebuild + fsync | 0 |
| 9 | Backend | Self-healing index + LAN status | 1 |
| 10 | UX | useFocusTrap hook | 2 |
| 11 | UX | Wire focus traps into all modals | 0 |
| 12 | UX | Skip-to-content + ARIA landmarks | 0 |
| 13 | UX | PhaseNav keyboard navigation | 0 |
| 14 | UX | Keyboard shortcut help dialog | 1 |
| 15 | UX | GlyphIcon aria-labels audit | 0 |
| 16 | UX | Live regions for notices | 0 |
| 17 | UX | Semantic HTML + heading hierarchy | 0 |
| 18 | UX | Reduced motion + deterministic sort | 1 |
| 19 | UX | Color contrast audit | 0 |
| 20 | Docs | Schema contract expansion | 0 |
| 21 | Docs | Template registry spec | 1 |
| 22 | Docs | Gate readiness rules | 1 |
| 23 | Docs | Governance modes | 1 |
| 24 | Final | Full verification pass | 0 |

**Total: 24 tasks, ~15 new files, ~20 modified files**
