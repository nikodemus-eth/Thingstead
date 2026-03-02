import { describe, it, expect } from "vitest";
import { validateAgileProfile } from "./validate.js";
import { buildNewAgileProject } from "./index.js";

describe("validateAgileProfile", () => {
  it("passes validation for a valid agile project", () => {
    const project = buildNewAgileProject("Valid", "d", "team");
    const errors = [];
    const warnings = [];
    validateAgileProfile(project, { errors, warnings });
    expect(errors).toHaveLength(0);
  });

  it("fails if phase count is wrong", () => {
    const project = buildNewAgileProject("Bad", "d", "team");
    project.phases = project.phases.slice(0, 3); // Only 3 phases.
    const errors = [];
    validateAgileProfile(project, { errors });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("8 phases");
  });

  it("fails if phase names don't match canonical set", () => {
    const project = buildNewAgileProject("Bad", "d", "team");
    project.phases[1] = { ...project.phases[1], name: "Not Sprint Planning" };
    const errors = [];
    const warnings = [];
    validateAgileProfile(project, { errors, warnings });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("canonical phase names");
  });
});
