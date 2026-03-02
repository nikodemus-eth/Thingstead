import { describe, it, expect } from "vitest";
import { normalizeName, validatePhaseStructure } from "./validationUtils.js";

describe("normalizeName", () => {
  it("lowercases and trims", () => {
    expect(normalizeName("  Sprint Planning  ")).toBe("sprint planning");
  });

  it("collapses whitespace", () => {
    expect(normalizeName("sprint   planning")).toBe("sprint planning");
  });

  it("handles null/undefined", () => {
    expect(normalizeName(null)).toBe("");
    expect(normalizeName(undefined)).toBe("");
  });
});

describe("validatePhaseStructure", () => {
  function makePhases(names) {
    return names.map((name, i) => ({ id: i + 1, name }));
  }

  const canonical = ["alpha", "beta", "gamma"];

  it("passes for valid structure", () => {
    const errors = [];
    const warnings = [];
    validatePhaseStructure(
      { phases: makePhases(["Alpha", "Beta", "Gamma"]) },
      { errors, warnings },
      { expectedCount: 3, canonicalNames: canonical, label: "Test" }
    );
    expect(errors).toHaveLength(0);
  });

  it("fails if phases is not an array", () => {
    const errors = [];
    validatePhaseStructure(
      { phases: "not-array" },
      { errors },
      { expectedCount: 3, canonicalNames: canonical, label: "Test" }
    );
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("project.phases array");
  });

  it("fails if phase count is wrong", () => {
    const errors = [];
    validatePhaseStructure(
      { phases: makePhases(["Alpha", "Beta"]) },
      { errors },
      { expectedCount: 3, canonicalNames: canonical, label: "Test" }
    );
    expect(errors[0]).toContain("3 phases");
  });

  it("fails if phase IDs are not sequential", () => {
    const errors = [];
    const phases = [
      { id: 1, name: "Alpha" },
      { id: 5, name: "Beta" },
      { id: 9, name: "Gamma" },
    ];
    validatePhaseStructure(
      { phases },
      { errors },
      { expectedCount: 3, canonicalNames: canonical, label: "Test" }
    );
    expect(errors[0]).toContain("phase IDs");
  });

  it("fails if phase names don't match canonical set", () => {
    const errors = [];
    const warnings = [];
    validatePhaseStructure(
      { phases: makePhases(["Alpha", "Beta", "Wrong"]) },
      { errors, warnings },
      { expectedCount: 3, canonicalNames: canonical, label: "Test" }
    );
    expect(errors[0]).toContain("canonical phase names");
    expect(warnings.length).toBeGreaterThan(0);
  });

  it("populates missing and extra warnings", () => {
    const errors = [];
    const warnings = [];
    validatePhaseStructure(
      { phases: makePhases(["Alpha", "Beta", "Extra"]) },
      { errors, warnings },
      { expectedCount: 3, canonicalNames: canonical, label: "Test" }
    );
    expect(warnings.some((w) => w.includes("missing"))).toBe(true);
    expect(warnings.some((w) => w.includes("extra"))).toBe(true);
  });
});
