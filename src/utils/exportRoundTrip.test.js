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
