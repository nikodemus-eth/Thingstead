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
