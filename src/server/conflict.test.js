// @vitest-environment node
import { describe, it, expect } from "vitest";
import { promises as fsp } from "node:fs";
import path from "node:path";
import os from "node:os";
import { shouldAcceptWrite, rebuildIndex } from "../../server/conflict.mjs";

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

  it("accepts when existing timestamp is unparseable", () => {
    expect(shouldAcceptWrite("not-a-date", "2026-01-01T00:00:00.000Z")).toBe(true);
  });

  it("accepts when incoming timestamp is unparseable", () => {
    expect(shouldAcceptWrite("2026-01-01T00:00:00.000Z", "not-a-date")).toBe(true);
  });
});

describe("rebuildIndex", () => {
  it("returns empty projects for empty directory", async () => {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ts-rebuild-test-"));
    try {
      const result = await rebuildIndex(tmpDir);
      expect(result.projects).toEqual({});
      expect(result.currentProjectId).toBeNull();
    } finally {
      await fsp.rm(tmpDir, { recursive: true });
    }
  });

  it("indexes a single project file", async () => {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ts-rebuild-test-"));
    try {
      const project = { id: "p1", name: "My Project", lastModified: "2026-01-01T00:00:00.000Z" };
      await fsp.writeFile(path.join(tmpDir, "p1.json"), JSON.stringify(project), "utf8");
      const result = await rebuildIndex(tmpDir);
      expect(result.projects["p1"]).toMatchObject({ id: "p1", name: "My Project" });
    } finally {
      await fsp.rm(tmpDir, { recursive: true });
    }
  });

  it("skips non-JSON files", async () => {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ts-rebuild-test-"));
    try {
      await fsp.writeFile(path.join(tmpDir, "notes.txt"), "hello", "utf8");
      const result = await rebuildIndex(tmpDir);
      expect(Object.keys(result.projects)).toHaveLength(0);
    } finally {
      await fsp.rm(tmpDir, { recursive: true });
    }
  });

  it("skips corrupt JSON files", async () => {
    const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "ts-rebuild-test-"));
    try {
      await fsp.writeFile(path.join(tmpDir, "bad.json"), "{ not valid json", "utf8");
      const result = await rebuildIndex(tmpDir);
      expect(Object.keys(result.projects)).toHaveLength(0);
    } finally {
      await fsp.rm(tmpDir, { recursive: true });
    }
  });

  it("returns empty projects when directory does not exist", async () => {
    const result = await rebuildIndex("/nonexistent/path/xyz");
    expect(result.projects).toEqual({});
  });
});
