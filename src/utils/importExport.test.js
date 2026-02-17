import { describe, it, expect } from "vitest";
import { validateImport, importProject } from "./importExport.js";
import { normalizeProject } from "./normalizeProject.js";

function makeMinimalProject(overrides = {}) {
  const now = new Date().toISOString();
  return normalizeProject({
    id: "test-id",
    name: "Test Project",
    schemaVersion: 1,
    plan_id: "cpmai",
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
  });
}

describe("validateImport", () => {
  it("rejects invalid JSON", () => {
    const result = validateImport("not json{{{");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Invalid JSON.");
  });

  it("rejects unsupported bundle schemaVersion", () => {
    const bundle = JSON.stringify({ schemaVersion: 99, project: makeMinimalProject() });
    const result = validateImport(bundle);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/unsupported.*schemaversion/i);
  });

  it("accepts a valid raw project JSON", () => {
    const project = makeMinimalProject();
    const result = validateImport(JSON.stringify(project));
    expect(result.valid).toBe(true);
    expect(result.project).not.toBeNull();
  });
});

describe("importProject", () => {
  it("returns invalid for bad JSON", () => {
    const result = importProject("{broken", {});
    expect(result.status).toBe("invalid");
    expect(result.errors).toContain("Invalid JSON.");
  });

  it("detects collision with existing projects", () => {
    const project = makeMinimalProject({ id: "existing-id" });
    const existing = { "existing-id": { id: "existing-id", name: "Old" } };
    const result = importProject(JSON.stringify(project), existing);
    expect(result.status).toBe("collision");
    expect(result.project.id).toBe("existing-id");
  });

  it("returns success for valid non-colliding import", () => {
    const project = makeMinimalProject({ id: "new-id" });
    const result = importProject(JSON.stringify(project), {});
    expect(result.status).toBe("success");
    expect(result.project.id).toBe("new-id");
  });
});
