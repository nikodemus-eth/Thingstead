// @vitest-environment node
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import process from "node:process";

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on("error", reject);
    srv.listen(0, "127.0.0.1", () => {
      const addr = srv.address();
      srv.close(() => resolve(addr.port));
    });
  });
}

async function waitForOk(url, timeoutMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start <= timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // ignore until ready
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Server not ready: ${url}`);
}

describe.sequential("OpenClaw API", () => {
  /** @type {import("node:child_process").ChildProcess | null} */
  let child = null;
  let baseUrl = "";
  let tmpRoot = "";

  beforeAll(async () => {
    const port = await getFreePort();
    baseUrl = `http://127.0.0.1:${port}`;

    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "thingstead-oc-test-"));
    const dataDir = path.join(tmpRoot, "data");
    const distDir = path.join(tmpRoot, "dist");
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(distDir, { recursive: true });
    await fs.writeFile(path.join(distDir, "index.html"), "<!doctype html><title>ok</title>", "utf8");

    child = spawn(
      process.execPath,
      [
        path.resolve(process.cwd(), "server/server.mjs"),
        "--host", "127.0.0.1",
        "--port", String(port),
        "--dataDir", dataDir,
        "--distDir", distDir,
        "--strictPort",
      ],
      { stdio: "ignore", env: { ...process.env, HOST: "127.0.0.1", PORT: String(port) } }
    );

    await waitForOk(`${baseUrl}/api/health`);
  }, 60_000);

  afterAll(async () => {
    try {
      if (child && !child.killed) child.kill("SIGTERM");
    } finally {
      child = null;
    }
    if (tmpRoot) await fs.rm(tmpRoot, { recursive: true, force: true });
  });

  // ── Health ──────────────────────────────────────────────────────────────

  it("GET /api/openclaw/health returns integration payload", async () => {
    const res = await fetch(`${baseUrl}/api/openclaw/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true, integration: "openclaw-thingstead-v1.0" });
  });

  it("GET /api/openclaw/health sets X-Thingstead-Deterministic header", async () => {
    const res = await fetch(`${baseUrl}/api/openclaw/health`);
    expect(res.headers.get("x-thingstead-deterministic")).toBe("true");
  });

  // ── Project listing ──────────────────────────────────────────────────────

  it("GET /api/openclaw/projects returns empty projects initially", async () => {
    const res = await fetch(`${baseUrl}/api/openclaw/projects`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("projects");
    expect(typeof body.projects).toBe("object");
    expect(Object.keys(body.projects)).toHaveLength(0);
  });

  // ── Project creation ─────────────────────────────────────────────────────

  it("POST /api/openclaw/projects creates a project and returns 201", async () => {
    const res = await fetch(`${baseUrl}/api/openclaw/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Test Fleet", planId: "openclaws-agent-lifecycle" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(typeof body.project.id).toBe("string");
    expect(body.project.name).toBe("Test Fleet");
    expect(body.project.plan_id).toBe("openclaws-agent-lifecycle");
    expect(body.project.openclaw.linkedAgentIds).toEqual([]);
    expect(body.project.openclaw.advisoryDrafts).toEqual({});
  });

  it("POST /api/openclaw/projects returns 400 when name is missing", async () => {
    const res = await fetch(`${baseUrl}/api/openclaw/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planId: "cpmai" }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("INVALID_BODY");
  });

  it("POST /api/openclaw/projects returns 400 when planId is missing", async () => {
    const res = await fetch(`${baseUrl}/api/openclaw/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "No Plan" }),
    });
    expect(res.status).toBe(400);
  });

  // ── Project retrieval ─────────────────────────────────────────────────────

  it("GET /api/openclaw/projects/:id returns created project with openclaw block", async () => {
    // Create a project first
    const createRes = await fetch(`${baseUrl}/api/openclaw/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Retrieve Me", planId: "cpmai", linkedAgentIds: ["seed-agent"] }),
    });
    const { project } = await createRes.json();

    const res = await fetch(`${baseUrl}/api/openclaw/projects/${project.id}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.project.id).toBe(project.id);
    expect(body.project.name).toBe("Retrieve Me");
    expect(body.project.openclaw.linkedAgentIds).toEqual(["seed-agent"]);
  });

  it("GET /api/openclaw/projects/:id returns 404 for unknown project", async () => {
    const res = await fetch(`${baseUrl}/api/openclaw/projects/nonexistent-project-xyz`);
    expect(res.status).toBe(404);
  });

  it("GET /api/openclaw/projects lists created projects with openclaw metadata", async () => {
    const res = await fetch(`${baseUrl}/api/openclaw/projects`);
    expect(res.status).toBe(200);
    const body = await res.json();
    const values = Object.values(body.projects);
    expect(values.length).toBeGreaterThan(0);
    for (const p of values) {
      expect(p).toHaveProperty("openclaw");
      expect(Array.isArray(p.openclaw.linkedAgentIds)).toBe(true);
    }
  });

  // ── Heartbeat ─────────────────────────────────────────────────────────────

  it("POST /api/openclaw/heartbeat registers agentId and sets timestamp", async () => {
    const createRes = await fetch(`${baseUrl}/api/openclaw/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Heartbeat Project", planId: "cpmai" }),
    });
    const { project } = await createRes.json();

    const hbRes = await fetch(`${baseUrl}/api/openclaw/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, agentId: "agent-007" }),
    });
    expect(hbRes.status).toBe(200);
    const hbBody = await hbRes.json();
    expect(hbBody.ok).toBe(true);
    expect(hbBody.agentId).toBe("agent-007");
    expect(hbBody.linkedAgentIds).toContain("agent-007");
    expect(typeof hbBody.lastAgentHeartbeat).toBe("string");

    // Verify persisted
    const getRes = await fetch(`${baseUrl}/api/openclaw/projects/${project.id}`);
    const getBody = await getRes.json();
    expect(getBody.project.openclaw.linkedAgentIds).toContain("agent-007");
    expect(typeof getBody.project.openclaw.lastAgentHeartbeat).toBe("string");
  });

  it("POST /api/openclaw/heartbeat is idempotent (same agentId twice not duplicated)", async () => {
    const createRes = await fetch(`${baseUrl}/api/openclaw/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Idempotent Project", planId: "cpmai" }),
    });
    const { project } = await createRes.json();

    for (let i = 0; i < 2; i++) {
      await fetch(`${baseUrl}/api/openclaw/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, agentId: "agent-idempotent" }),
      });
    }

    const getRes = await fetch(`${baseUrl}/api/openclaw/projects/${project.id}`);
    const getBody = await getRes.json();
    const ids = getBody.project.openclaw.linkedAgentIds;
    expect(ids.filter((id) => id === "agent-idempotent")).toHaveLength(1);
  });

  it("POST /api/openclaw/heartbeat returns 404 for unknown project", async () => {
    const res = await fetch(`${baseUrl}/api/openclaw/heartbeat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "nonexistent-xyz", agentId: "agent-x" }),
    });
    expect(res.status).toBe(404);
  });

  // ── Proposals ────────────────────────────────────────────────────────────

  it("POST /api/openclaw/proposals stores draft in advisoryDrafts only (never touches phases)", async () => {
    const createRes = await fetch(`${baseUrl}/api/openclaw/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Proposal Project", planId: "cpmai" }),
    });
    const { project } = await createRes.json();

    const propRes = await fetch(`${baseUrl}/api/openclaw/proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, draftId: "draft-1", content: "Agent draft content" }),
    });
    expect(propRes.status).toBe(200);
    const propBody = await propRes.json();
    expect(propBody.ok).toBe(true);
    expect(propBody.draftId).toBe("draft-1");

    // Verify: draft stored, phases untouched
    const getRes = await fetch(`${baseUrl}/api/openclaw/projects/${project.id}`);
    const getBody = await getRes.json();
    expect(getBody.project.openclaw.advisoryDrafts["draft-1"].content).toBe("Agent draft content");
    expect(typeof getBody.project.openclaw.advisoryDrafts["draft-1"].createdAt).toBe("string");
    // phases must remain the empty array from creation
    expect(getBody.project.phases).toEqual([]);
  });

  it("POST /api/openclaw/proposals returns 404 for unknown project", async () => {
    const res = await fetch(`${baseUrl}/api/openclaw/proposals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "nonexistent-xyz", draftId: "d1", content: "hello" }),
    });
    expect(res.status).toBe(404);
  });

  // ── Gate ─────────────────────────────────────────────────────────────────

  it("GET /api/openclaw/gate/:id/:phase returns advisory stub", async () => {
    const createRes = await fetch(`${baseUrl}/api/openclaw/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Gate Project", planId: "cpmai" }),
    });
    const { project } = await createRes.json();

    const res = await fetch(`${baseUrl}/api/openclaw/gate/${project.id}/1`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ready).toBe(true);
    expect(body.advisory).toBe(true);
    expect(body.projectId).toBe(project.id);
    expect(body.phaseNumber).toBe(1);
  });

  it("GET /api/openclaw/gate/:id/:phase returns 404 for unknown project", async () => {
    const res = await fetch(`${baseUrl}/api/openclaw/gate/nonexistent-xyz/1`);
    expect(res.status).toBe(404);
  });
});
