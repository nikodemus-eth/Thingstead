import { describe, it, expect, beforeEach } from "vitest";
import {
  saveProjectIndex,
  loadProjectIndex,
  saveProject,
  loadProject,
  deleteProject,
  saveProjectAndIndex,
  deleteProjectAndIndex,
  saveSettings,
  loadSettings,
  getStorageUsage,
} from "./storage.js";
import { CURRENT_SCHEMA_VERSION } from "../migrations/index.js";

describe("storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("project index", () => {
    it("round-trips project index", () => {
      const index = { currentProjectId: "p1", projects: { p1: { id: "p1", name: "Test" } } };
      saveProjectIndex(index);
      expect(loadProjectIndex()).toEqual(index);
    });

    it("returns null when no index saved", () => {
      expect(loadProjectIndex()).toBeNull();
    });
  });

  describe("project data", () => {
    it("round-trips project data (with migration on load)", () => {
      const data = { current: { id: "p1", name: "Test" }, history: [], historyIndex: -1 };
      saveProject("p1", data);
      const loaded = loadProject("p1");
      expect(loaded).toMatchObject({ current: { id: "p1", name: "Test" }, history: [], historyIndex: -1 });
      expect(loaded.current.meta.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    });

    it("returns null for missing project", () => {
      expect(loadProject("nonexistent")).toBeNull();
    });

    it("deletes project", () => {
      saveProject("p1", { current: { id: "p1" } });
      expect(loadProject("p1")).not.toBeNull();
      deleteProject("p1");
      expect(loadProject("p1")).toBeNull();
    });
  });

  describe("settings", () => {
    it("round-trips settings", () => {
      const settings = { deviceId: "test-device", theme: "dark" };
      saveSettings(settings);
      expect(loadSettings()).toEqual(settings);
    });
  });

  describe("atomic operations", () => {
    it("saveProjectAndIndex writes both atomically", () => {
      const data = { current: { id: "p1" }, history: [], historyIndex: -1 };
      const index = { currentProjectId: "p1", projects: { p1: { id: "p1" } } };
      const result = saveProjectAndIndex("p1", data, index);
      expect(result).not.toBeNull();
      const loaded = loadProject("p1");
      expect(loaded).toMatchObject({ current: { id: "p1" }, history: [], historyIndex: -1 });
      expect(loaded.current.meta.schema_version).toBe(CURRENT_SCHEMA_VERSION);
      expect(loadProjectIndex()).toEqual(index);
    });

    it("deleteProjectAndIndex removes project and updates index", () => {
      saveProject("p1", { current: { id: "p1" } });
      const newIndex = { currentProjectId: null, projects: {} };
      deleteProjectAndIndex("p1", newIndex);
      expect(loadProject("p1")).toBeNull();
      expect(loadProjectIndex()).toEqual(newIndex);
    });
  });

  describe("getStorageUsage", () => {
    it("returns zero usage when storage is empty", () => {
      const usage = getStorageUsage();
      expect(usage.usedBytes).toBe(0);
      expect(usage.isWarning).toBe(false);
      expect(usage.isCritical).toBe(false);
    });

    it("reports non-zero usage after saving", () => {
      saveProjectIndex({ projects: {} });
      const usage = getStorageUsage();
      expect(usage.usedBytes).toBeGreaterThan(0);
    });
  });

  describe("loadProject with migration", () => {
    it("migrates a legacy project (no schema_version) to CURRENT_SCHEMA_VERSION", () => {
      const legacyProject = {
        id: "legacy-1",
        name: "Legacy Project",
        governance_mode: "solo",
        phases: [],
      };
      const stored = { current: legacyProject, history: [], historyIndex: -1 };
      saveProject("legacy-1", stored);

      const loaded = loadProject("legacy-1");
      expect(loaded).not.toBeNull();
      expect(loaded.current.meta.schema_version).toBe(CURRENT_SCHEMA_VERSION);
    });

    it("returns null for missing project even with migration wired", () => {
      expect(loadProject("nonexistent")).toBeNull();
    });

    it("returns data as-is when current is missing", () => {
      const stored = { history: [], historyIndex: -1 };
      saveProject("no-current", stored);
      const loaded = loadProject("no-current");
      expect(loaded).toEqual(stored);
    });
  });
});
