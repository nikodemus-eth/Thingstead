import { describe, it, expect } from "vitest";
import { AIPO_PLAN_ID, AIPO_PLAN_VERSION, buildNewAipoProject } from "./index.js";

describe("AIPO plan constants", () => {
  it("exports expected plan ID and version", () => {
    expect(AIPO_PLAN_ID).toBe("aipo-governance");
    expect(AIPO_PLAN_VERSION).toBe("1.0.0");
  });
});

describe("buildNewAipoProject", () => {
  const project = buildNewAipoProject("Test AIPO", "device-1", "team");

  it("creates a project with correct plan metadata", () => {
    expect(project.plan_id).toBe(AIPO_PLAN_ID);
    expect(project.plan_version).toBe(AIPO_PLAN_VERSION);
    expect(project.plan).toEqual({ id: AIPO_PLAN_ID, version: AIPO_PLAN_VERSION });
    expect(project.name).toBe("Test AIPO");
  });

  it("creates exactly 8 phases", () => {
    expect(project.phases).toHaveLength(8);
  });

  it("assigns phase codes P0 through P7", () => {
    const codes = project.phases.map((p) => p.code);
    expect(codes).toEqual(["P0", "P1", "P2", "P3", "P4", "P5", "P6", "P7"]);
  });

  it("assigns phase IDs 1 through 8", () => {
    const ids = project.phases.map((p) => p.id);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("assigns color objects to every phase", () => {
    for (const phase of project.phases) {
      expect(phase.color).toBeTruthy();
      expect(phase.color.bg).toBeTruthy();
      expect(phase.color.text).toBeTruthy();
    }
  });

  it("generates unique artifact IDs across all phases", () => {
    const ids = project.phases.flatMap((p) => p.artifacts.map((a) => a.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("creates the correct total number of artifacts (40)", () => {
    const total = project.phases.reduce((sum, p) => sum + p.artifacts.length, 0);
    expect(total).toBe(40);
  });

  it("marks exactly one gate-blocking artifact per phase", () => {
    for (const phase of project.phases) {
      const gateBlockers = phase.artifacts.filter((a) => a.isGateBlocking);
      expect(gateBlockers).toHaveLength(1);
      expect(gateBlockers[0].name).toMatch(/gate record/i);
    }
  });

  it("sets classification_level to INTERNAL by default", () => {
    expect(project.classification_level).toBe("INTERNAL");
  });

  it("assigns 5 approval roles to gate-blocking artifacts", () => {
    const gateArtifact = project.phases[0].artifacts.find((a) => a.isGateBlocking);
    expect(gateArtifact.approvals).toHaveLength(5);
    const roles = gateArtifact.approvals.map((a) => a.role);
    expect(roles).toContain("EXEC_SPONSOR");
    expect(roles).toContain("SYS_OWNER");
    expect(roles).toContain("GOV_AUTHORITY");
    expect(roles).toContain("SEC_AUTHORITY");
    expect(roles).toContain("PROJECT_MGR");
  });

  it("assigns 2 approval roles to non-gate artifacts", () => {
    const nonGate = project.phases[0].artifacts.find((a) => !a.isGateBlocking);
    expect(nonGate.approvals).toHaveLength(2);
    const roles = nonGate.approvals.map((a) => a.role);
    expect(roles).toContain("EXEC_SPONSOR");
    expect(roles).toContain("PROJECT_MGR");
  });

  it("initializes all approvals unsigned", () => {
    for (const phase of project.phases) {
      for (const artifact of phase.artifacts) {
        for (const approval of artifact.approvals) {
          expect(approval.name).toBe("");
          expect(approval.signedAt).toBeNull();
        }
      }
    }
  });

  it("sets initial doc_status to DRAFT on every artifact", () => {
    for (const phase of project.phases) {
      for (const artifact of phase.artifacts) {
        expect(artifact.doc_status).toBe("DRAFT");
      }
    }
  });

  it("creates an initial doc_version v1.0 on every artifact", () => {
    for (const phase of project.phases) {
      for (const artifact of phase.artifacts) {
        expect(artifact.doc_versions).toHaveLength(1);
        expect(artifact.doc_versions[0].version).toBe("1.0");
        expect(artifact.doc_versions[0].notes).toBe("Initial draft");
      }
    }
  });

  it("sets governance_mode correctly", () => {
    const teamProject = buildNewAipoProject("T", "d", "team");
    expect(teamProject.governance_mode).toBe("team");

    const soloProject = buildNewAipoProject("S", "d", "solo");
    expect(soloProject.governance_mode).toBe("solo");
    expect(soloProject.template_set_profile).toBe("minimum-compliance");
  });

  it("sets goNoGoDecision with solo attestation for solo mode", () => {
    const solo = buildNewAipoProject("S", "d", "solo");
    for (const phase of solo.phases) {
      expect(phase.goNoGoDecision.attestation_type).toBe("solo_attestation");
    }
  });

  it("sets goNoGoDecision with team decision for team mode", () => {
    for (const phase of project.phases) {
      expect(phase.goNoGoDecision.attestation_type).toBe("team_decision");
    }
  });

  it("initializes all artifacts with not-started status and empty fields", () => {
    for (const phase of project.phases) {
      for (const artifact of phase.artifacts) {
        expect(artifact.status).toBe("not-started");
        expect(artifact.rationale).toBe("");
        expect(artifact.notes).toBe("");
        expect(artifact.field_values).toEqual({});
        expect(artifact.waiver).toBeNull();
      }
    }
  });

  it("normalizes invalid governance_mode to team", () => {
    const p = buildNewAipoProject("X", "d", "invalid");
    expect(p.governance_mode).toBe("team");
  });
});
