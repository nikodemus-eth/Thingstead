import { describe, it, expect } from "vitest";
import { PMI_AGILE_PLAN_ID, PMI_AGILE_PLAN_VERSION, buildNewAgileProject } from "./index.js";
import { GovernanceTrack } from "../../kernel/governanceTracks.js";

describe("PMI Agile plan constants", () => {
  it("exports expected plan ID and version", () => {
    expect(PMI_AGILE_PLAN_ID).toBe("pmi-agile");
    expect(PMI_AGILE_PLAN_VERSION).toBe("1.0.0");
  });
});

describe("buildNewAgileProject", () => {
  const project = buildNewAgileProject("Test Agile", "device-1", "team");

  it("creates a project with correct plan metadata", () => {
    expect(project.plan_id).toBe(PMI_AGILE_PLAN_ID);
    expect(project.plan_version).toBe(PMI_AGILE_PLAN_VERSION);
    expect(project.plan).toEqual({ id: PMI_AGILE_PLAN_ID, version: PMI_AGILE_PLAN_VERSION });
    expect(project.name).toBe("Test Agile");
  });

  it("sets track to PMI_AGILE", () => {
    expect(project.track).toBe(GovernanceTrack.PMI_AGILE);
  });

  it("creates exactly 8 phases", () => {
    expect(project.phases).toHaveLength(8);
  });

  it("assigns phase codes A1 through A8", () => {
    const codes = project.phases.map((p) => p.code);
    expect(codes).toEqual(["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8"]);
  });

  it("marks phases 2-4 as iterative", () => {
    expect(project.phases[0].iterative).toBe(false); // A1
    expect(project.phases[1].iterative).toBe(true);  // A2
    expect(project.phases[2].iterative).toBe(true);  // A3
    expect(project.phases[3].iterative).toBe(true);  // A4
    expect(project.phases[4].iterative).toBe(false); // A5
  });

  it("generates unique artifact IDs across all phases", () => {
    const ids = project.phases.flatMap((p) => p.artifacts.map((a) => a.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("marks exactly one gate-blocking artifact per phase", () => {
    for (const phase of project.phases) {
      const gateBlockers = phase.artifacts.filter((a) => a.isGateBlocking);
      expect(gateBlockers).toHaveLength(1);
      expect(gateBlockers[0].name).toMatch(/gate record/i);
    }
  });

  it("includes agile-specific policy (allow_no_go_continue: true)", () => {
    expect(project.policy).toBeDefined();
    expect(project.policy.gate.allow_no_go_continue).toBe(true);
  });

  it("sets governance_mode correctly", () => {
    const teamProject = buildNewAgileProject("T", "d", "team");
    expect(teamProject.governance_mode).toBe("team");

    const soloProject = buildNewAgileProject("S", "d", "solo");
    expect(soloProject.governance_mode).toBe("solo");
    expect(soloProject.template_set_profile).toBe("minimum-compliance");
  });

  it("sets goNoGoDecision with correct attestation types", () => {
    const solo = buildNewAgileProject("S", "d", "solo");
    for (const phase of solo.phases) {
      expect(phase.goNoGoDecision.attestation_type).toBe("solo_attestation");
    }
    for (const phase of project.phases) {
      expect(phase.goNoGoDecision.attestation_type).toBe("team_decision");
    }
  });

  it("initializes all artifacts with not-started status", () => {
    for (const phase of project.phases) {
      for (const artifact of phase.artifacts) {
        expect(artifact.status).toBe("not-started");
        expect(artifact.waiver).toBeNull();
      }
    }
  });
});
