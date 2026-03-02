import { describe, it, expect } from "vitest";
import { PMI_WATERFALL_PLAN_ID, PMI_WATERFALL_PLAN_VERSION, buildNewWaterfallProject } from "./index.js";
import { GovernanceTrack } from "../../kernel/governanceTracks.js";

describe("PMI Waterfall plan constants", () => {
  it("exports expected plan ID and version", () => {
    expect(PMI_WATERFALL_PLAN_ID).toBe("pmi-waterfall");
    expect(PMI_WATERFALL_PLAN_VERSION).toBe("1.0.0");
  });
});

describe("buildNewWaterfallProject", () => {
  const project = buildNewWaterfallProject("Test Waterfall", "device-1", "team");

  it("creates a project with correct plan metadata", () => {
    expect(project.plan_id).toBe(PMI_WATERFALL_PLAN_ID);
    expect(project.plan_version).toBe(PMI_WATERFALL_PLAN_VERSION);
    expect(project.plan).toEqual({ id: PMI_WATERFALL_PLAN_ID, version: PMI_WATERFALL_PLAN_VERSION });
    expect(project.name).toBe("Test Waterfall");
  });

  it("sets track to PMI_WATERFALL", () => {
    expect(project.track).toBe(GovernanceTrack.PMI_WATERFALL);
  });

  it("creates exactly 8 phases", () => {
    expect(project.phases).toHaveLength(8);
  });

  it("assigns phase codes W1 through W8", () => {
    const codes = project.phases.map((p) => p.code);
    expect(codes).toEqual(["W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8"]);
  });

  it("generates unique artifact IDs across all phases", () => {
    const ids = project.phases.flatMap((p) => p.artifacts.map((a) => a.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("creates the correct total number of artifacts (34)", () => {
    const total = project.phases.reduce((sum, p) => sum + p.artifacts.length, 0);
    expect(total).toBe(34);
  });

  it("marks exactly one gate-blocking artifact per phase", () => {
    for (const phase of project.phases) {
      const gateBlockers = phase.artifacts.filter((a) => a.isGateBlocking);
      expect(gateBlockers).toHaveLength(1);
      expect(gateBlockers[0].name).toMatch(/gate record/i);
    }
  });

  it("includes waterfall-specific policy with tiered friction", () => {
    expect(project.policy).toBeDefined();
    expect(project.policy.waiver.friction.core.rationale_min_length).toBe(80);
    expect(project.policy.waiver.friction.conditional.rationale_min_length).toBe(40);
    expect(project.policy.gate.allow_no_go_continue).toBe(false);
  });

  it("sets governance_mode correctly", () => {
    const teamProject = buildNewWaterfallProject("T", "d", "team");
    expect(teamProject.governance_mode).toBe("team");

    const soloProject = buildNewWaterfallProject("S", "d", "solo");
    expect(soloProject.governance_mode).toBe("solo");
    expect(soloProject.template_set_profile).toBe("minimum-compliance");
  });

  it("sets goNoGoDecision with correct attestation types", () => {
    const solo = buildNewWaterfallProject("S", "d", "solo");
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
