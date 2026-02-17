import { describe, it, expect } from "vitest";
import {
  wrapProjectInBundle,
  isExportBundle,
  unwrapImportedPayload,
  buildBundleFilename,
  EXPORT_BUNDLE_SCHEMA_VERSION,
} from "./exportBundle.js";

describe("exportBundle", () => {
  it("wraps project in a versioned bundle", () => {
    const project = { id: "p1", name: "My Project" };
    const bundle = wrapProjectInBundle(project, {
      createdAt: "2026-02-14T00:00:00.000Z",
      appVersion: "0.9.0",
    });
    expect(bundle.schemaVersion).toBe(EXPORT_BUNDLE_SCHEMA_VERSION);
    expect(bundle.createdAt).toBe("2026-02-14T00:00:00.000Z");
    expect(bundle.appVersion).toBe("0.9.0");
    expect(bundle.project).toBe(project);
    expect(isExportBundle(bundle)).toBe(true);
  });

  it("unwraps bundles and raw project payloads", () => {
    const project = { id: "p1" };
    const bundle = wrapProjectInBundle(project, {
      createdAt: "2026-02-14T00:00:00.000Z",
    });
    expect(unwrapImportedPayload(bundle).kind).toBe("bundle");
    expect(unwrapImportedPayload(bundle).project).toEqual(project);
    expect(unwrapImportedPayload(project).kind).toBe("project");
    expect(unwrapImportedPayload(project).project).toEqual(project);
  });

  it("builds a deterministic filename with slug + date", () => {
    const bundle = wrapProjectInBundle(
      { id: "p1", name: "CPMAI: Alpha / Beta" },
      { createdAt: "2026-02-14T12:34:56.789Z" }
    );
    expect(buildBundleFilename(bundle)).toBe("thingstead-project_cpmai-alpha-beta_2026-02-14.json");
  });
});

