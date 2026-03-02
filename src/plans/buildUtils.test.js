import { describe, it, expect } from "vitest";
import { buildProjectFromTemplate } from "./buildUtils.js";
import { GovernanceTrack } from "../kernel/governanceTracks.js";

const SIMPLE_TEMPLATE = {
  phases: [
    {
      id: 1,
      name: "Phase One",
      code: "P1",
      color: { bg: "#000", text: "#fff" },
      artifacts: [
        { name: "Gate Record", category: "core", isGateBlocking: true },
        { name: "Document A", category: "conditional", isGateBlocking: false, templateSlug: "doc-a" },
      ],
    },
    {
      id: 2,
      name: "Phase Two",
      code: "P2",
      color: { bg: "#111", text: "#eee" },
      artifacts: [
        { name: "Gate Record", category: "core", isGateBlocking: true },
      ],
    },
  ],
};

describe("buildProjectFromTemplate", () => {
  const project = buildProjectFromTemplate({
    template: SIMPLE_TEMPLATE,
    planId: "test-plan",
    planVersion: "1.0.0",
    track: GovernanceTrack.PMI_WATERFALL,
    name: "Test Project",
    deviceId: "dev-1",
    governanceMode: "team",
  });

  it("sets plan metadata correctly", () => {
    expect(project.plan_id).toBe("test-plan");
    expect(project.plan_version).toBe("1.0.0");
    expect(project.plan).toEqual({ id: "test-plan", version: "1.0.0" });
    expect(project.track).toBe(GovernanceTrack.PMI_WATERFALL);
  });

  it("creates phases from template", () => {
    expect(project.phases).toHaveLength(2);
    expect(project.phases[0].name).toBe("Phase One");
    expect(project.phases[0].code).toBe("P1");
    expect(project.phases[1].name).toBe("Phase Two");
  });

  it("creates artifacts with unique IDs", () => {
    const allIds = project.phases.flatMap((p) => p.artifacts.map((a) => a.id));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("initializes artifacts with correct defaults", () => {
    const art = project.phases[0].artifacts[1];
    expect(art.status).toBe("not-started");
    expect(art.waiver).toBeNull();
    expect(art.template_id).toBe("doc-a");
    expect(art.field_values).toEqual({});
  });

  it("sets governance_mode and template_set_profile", () => {
    expect(project.governance_mode).toBe("team");
    expect(project.template_set_profile).toBe("standard");

    const solo = buildProjectFromTemplate({
      template: SIMPLE_TEMPLATE,
      planId: "test",
      planVersion: "1.0.0",
      track: GovernanceTrack.PMI_WATERFALL,
      name: "Solo",
      deviceId: "d",
      governanceMode: "solo",
    });
    expect(solo.governance_mode).toBe("solo");
    expect(solo.template_set_profile).toBe("minimum-compliance");
  });

  it("sets attestation type based on governance mode", () => {
    expect(project.phases[0].goNoGoDecision.attestation_type).toBe("team_decision");

    const solo = buildProjectFromTemplate({
      template: SIMPLE_TEMPLATE,
      planId: "test",
      planVersion: "1.0.0",
      track: GovernanceTrack.PMI_WATERFALL,
      name: "Solo",
      deviceId: "d",
      governanceMode: "solo",
    });
    expect(solo.phases[0].goNoGoDecision.attestation_type).toBe("solo_attestation");
  });

  it("applies phaseExtras when provided", () => {
    const withExtras = buildProjectFromTemplate({
      template: SIMPLE_TEMPLATE,
      planId: "test",
      planVersion: "1.0.0",
      track: GovernanceTrack.PMI_AGILE,
      name: "Extras",
      deviceId: "d",
      phaseExtras: (phase) => ({ custom: phase.id * 10 }),
    });
    expect(withExtras.phases[0].custom).toBe(10);
    expect(withExtras.phases[1].custom).toBe(20);
  });

  it("includes empty ledger and audit_log", () => {
    expect(project.ledger).toEqual([]);
    expect(project.audit_log).toEqual([]);
  });

  it("compiles track-aware policy", () => {
    expect(project.policy).toBeDefined();
    expect(project.policy.gate.allow_no_go_continue).toBe(false); // PMI_WATERFALL default
  });
});
