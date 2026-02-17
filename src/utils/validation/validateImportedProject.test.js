import { describe, it, expect } from "vitest";
import { validateImportedProject } from "./validateImportedProject.js";

function minimalProject(overrides = {}) {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: "proj-1",
    name: "Test",
    description: "",
    governance_mode: "team",
    project_owner: "owner:test",
    template_set_profile: "standard",
    created: now,
    lastModified: now,
    lastSavedFrom: "test",
    phases: [
      {
        id: 1,
        name: "Phase A",
        phase_number: 1,
        goNoGoDecision: { status: "pending", decidedAt: null, notes: "", attestation_type: "team_decision" },
        artifacts: [
          {
            id: "a1",
            name: "Artifact",
            category: "core",
            isGateBlocking: true,
            assigned_to: "owner:test",
            rationale: "",
            notes: "",
            comments: [],
            lastModified: now,
            waiver: null,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("validateImportedProject (core)", () => {
  it("accepts >= 1 phase and does not enforce CPMAI profile by default", () => {
    const out = validateImportedProject(minimalProject(), { enforcePlanValidation: false });
    expect(out.ok).toBe(true);
  });

  it("enforces CPMAI profile only when requested", () => {
    const out = validateImportedProject(minimalProject({ plan_id: "cpmai" }), { enforcePlanValidation: true });
    expect(out.ok).toBe(false);
    expect(out.errors.join("\n")).toMatch(/exactly 6 phases/i);
  });
});

