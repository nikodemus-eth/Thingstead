import { describe, it, expect } from "vitest";
import { validateAipoProfile } from "./validate.js";
import { buildNewAipoProject } from "./index.js";

function runValidation(project) {
  const errors = [];
  const warnings = [];
  validateAipoProfile(project, { errors, warnings });
  return { errors, warnings };
}

describe("validateAipoProfile", () => {
  it("passes validation for a well-formed AIPO project", () => {
    const project = buildNewAipoProject("Valid AIPO", "dev-1", "team");
    const { errors, warnings } = runValidation(project);
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it("reports error when phases is not an array", () => {
    const { errors } = runValidation({ phases: "not-an-array" });
    expect(errors).toContain("AIPO profile requires project.phases array.");
  });

  it("reports error when phases is missing", () => {
    const { errors } = runValidation({});
    expect(errors).toContain("AIPO profile requires project.phases array.");
  });

  it("reports error when phase count is not 8", () => {
    const { errors } = runValidation({
      phases: [{ id: 1, name: "Only One" }],
    });
    expect(errors).toContain("AIPO profile requires exactly 8 phases.");
  });

  it("reports error when phase IDs are not 1..8", () => {
    const phases = Array.from({ length: 8 }, (_, i) => ({
      id: i + 10,
      name: [
        "Strategic Initiation",
        "Problem Definition",
        "Data Understanding",
        "Data Preparation",
        "Modeling",
        "Evaluation",
        "Deployment & Monitoring",
        "Controlled Closure & Stewardship",
      ][i],
    }));
    const { errors } = runValidation({ phases });
    expect(errors).toContain("AIPO profile requires phase IDs to be exactly [1..8].");
  });

  it("reports error when phase names do not match canonical set", () => {
    const phases = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      name: `Phase ${i + 1}`,
    }));
    const { errors } = runValidation({ phases });
    expect(errors[0]).toMatch(/canonical phase names/i);
  });

  it("reports missing and extra phase names in warnings", () => {
    const canonical = [
      "Strategic Initiation",
      "Problem Definition",
      "Data Understanding",
      "Data Preparation",
      "Modeling",
      "Evaluation",
      "Deployment & Monitoring",
      "Controlled Closure & Stewardship",
    ];
    const phases = canonical.map((name, i) => ({
      id: i + 1,
      name: i === 0 ? "Wrong Name" : name,
    }));
    const { warnings } = runValidation({ phases });
    expect(warnings.some((w) => w.includes("missing"))).toBe(true);
    expect(warnings.some((w) => w.includes("extra"))).toBe(true);
  });

  it("is tolerant of whitespace and casing in phase names", () => {
    const project = buildNewAipoProject("Tolerant", "dev-1");
    project.phases[0].name = "  STRATEGIC  INITIATION  ";
    const { errors } = runValidation(project);
    expect(errors).toHaveLength(0);
  });

  it("warns on invalid classification_level", () => {
    const project = buildNewAipoProject("CL Test", "dev-1");
    project.classification_level = "TOP_SECRET";
    const { warnings } = runValidation(project);
    expect(warnings[0]).toMatch(/TOP_SECRET.*not a recognized level/);
  });

  it("does not warn when classification_level is valid", () => {
    const project = buildNewAipoProject("CL Valid", "dev-1");
    project.classification_level = "CUI";
    const { warnings } = runValidation(project);
    expect(warnings).toHaveLength(0);
  });

  it("does not warn when classification_level is absent", () => {
    const project = buildNewAipoProject("No CL", "dev-1");
    delete project.classification_level;
    const { errors, warnings } = runValidation(project);
    expect(errors).toHaveLength(0);
    expect(warnings).toHaveLength(0);
  });

  it("reports error when a phase has no name", () => {
    const project = buildNewAipoProject("Empty Name", "dev-1");
    project.phases[3].name = "";
    const { errors } = runValidation(project);
    expect(errors.some((e) => e.includes("name"))).toBe(true);
  });
});
