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

describe.sequential("server API", () => {
  /** @type {import("node:child_process").ChildProcess | null} */
  let child = null;
  let baseUrl = "";
  let tmpRoot = "";
  let dataDir = "";

  beforeAll(async () => {
    const port = await getFreePort();
    baseUrl = `http://127.0.0.1:${port}`;

    tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "thingstead-test-"));
    dataDir = path.join(tmpRoot, "data");
    const distDir = path.join(tmpRoot, "dist");
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(distDir, { recursive: true });
    await fs.writeFile(path.join(distDir, "index.html"), "<!doctype html><title>ok</title>", "utf8");

    child = spawn(
      process.execPath,
      [
        path.resolve(process.cwd(), "server/server.mjs"),
        "--host",
        "127.0.0.1",
        "--port",
        String(port),
        "--dataDir",
        dataDir,
        "--distDir",
        distDir,
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

  it("GET /api/health returns ok", async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("CRUD: create, list, fetch, delete project", async () => {
    const list0 = await fetch(`${baseUrl}/api/projects`).then((r) => r.json());
    expect(list0).toEqual({ currentProjectId: null, projects: {} });

    const putRes = await fetch(`${baseUrl}/api/projects/p1`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: { name: "One", phases: [] } }),
    });
    expect(putRes.status).toBe(200);
    const putBody = await putRes.json();
    expect(putBody.ok).toBe(true);
    expect(putBody.project.id).toBe("p1");
    expect(putBody.index.projects.p1.name).toBe("One");

    const raw = await fs.readFile(path.join(dataDir, "projects", "p1.json"), "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed.id).toBe("p1");
    expect(parsed.name).toBe("One");

    const getRes = await fetch(`${baseUrl}/api/projects/p1`);
    expect(getRes.status).toBe(200);
    expect((await getRes.json()).project.name).toBe("One");

    const delRes = await fetch(`${baseUrl}/api/projects/p1`, { method: "DELETE" });
    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.ok).toBe(true);
    expect(delBody.index.projects).toEqual({});
  });

  it("validates project id and rejects ID mismatch", async () => {
    const badIdRes = await fetch(`${baseUrl}/api/projects/bad%20id`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: { name: "X" } }),
    });
    expect(badIdRes.status).toBe(400);
    expect(await badIdRes.json()).toEqual({ error: "INVALID_ID" });

    const mismatchRes = await fetch(`${baseUrl}/api/projects/p2`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project: { id: "p3", name: "Mismatch" } }),
    });
    expect(mismatchRes.status).toBe(400);
    expect(await mismatchRes.json()).toEqual({ error: "ID_MISMATCH" });
  });
});
