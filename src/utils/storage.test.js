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
    it("round-trips project data", () => {
      const data = { current: { id: "p1", name: "Test" }, history: [], historyIndex: -1 };
      saveProject("p1", data);
      expect(loadProject("p1")).toEqual(data);
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
      expect(loadProject("p1")).toEqual(data);
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
});
