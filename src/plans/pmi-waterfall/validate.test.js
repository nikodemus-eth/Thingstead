import { describe, it, expect } from "vitest";
import { validateWaterfallProfile } from "./validate.js";
import { buildNewWaterfallProject } from "./index.js";

describe("validateWaterfallProfile", () => {
  it("passes validation for a valid waterfall project", () => {
    const project = buildNewWaterfallProject("Valid", "d", "team");
    const errors = [];
    const warnings = [];
    validateWaterfallProfile(project, { errors, warnings });
    expect(errors).toHaveLength(0);
  });

  it("fails if phase count is wrong", () => {
    const project = buildNewWaterfallProject("Bad", "d", "team");
    project.phases = project.phases.slice(0, 5); // Only 5 phases.
    const errors = [];
    validateWaterfallProfile(project, { errors });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("8 phases");
  });

  it("fails if phase names don't match canonical set", () => {
    const project = buildNewWaterfallProject("Bad", "d", "team");
    project.phases[0] = { ...project.phases[0], name: "Wrong Name" };
    const errors = [];
    const warnings = [];
    validateWaterfallProfile(project, { errors, warnings });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("canonical phase names");
  });
});
