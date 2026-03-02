import { describe, it, expect } from "vitest";
import { getTrackPolicy, getRegisteredTracks } from "./trackPolicies.js";
import { GovernanceTrack, GateMode, ChangeControlMode, GateEnforcementLevel } from "./governanceTracks.js";

describe("getRegisteredTracks", () => {
  it("returns all four tracks", () => {
    const tracks = getRegisteredTracks();
    expect(tracks).toContain(GovernanceTrack.CPMAI);
    expect(tracks).toContain(GovernanceTrack.CPMAI_PLUS);
    expect(tracks).toContain(GovernanceTrack.PMI_WATERFALL);
    expect(tracks).toContain(GovernanceTrack.PMI_AGILE);
    expect(tracks).toHaveLength(4);
  });
});

describe("getTrackPolicy", () => {
  it("returns null for unknown track", () => {
    expect(getTrackPolicy("NONEXISTENT")).toBeNull();
  });

  it("returns valid config for every registered track", () => {
    for (const track of getRegisteredTracks()) {
      const config = getTrackPolicy(track);
      expect(config).not.toBeNull();
      expect(config.gateMode).toBeDefined();
      expect(config.changeControlMode).toBeDefined();
      expect(typeof config.baselineLocking).toBe("boolean");
      expect(config.gateEnforcementLevel).toBeDefined();
    }
  });

  it("PMI_WATERFALL is SEQUENTIAL + FORMAL_CCB + STRICT", () => {
    const config = getTrackPolicy(GovernanceTrack.PMI_WATERFALL);
    expect(config.gateMode).toBe(GateMode.SEQUENTIAL);
    expect(config.changeControlMode).toBe(ChangeControlMode.FORMAL_CCB);
    expect(config.baselineLocking).toBe(true);
    expect(config.gateEnforcementLevel).toBe(GateEnforcementLevel.STRICT);
    expect(config.iterativePhaseIds).toBeNull();
    // Policy overrides: tiered waiver friction.
    expect(config.policyOverrides.waiver.friction.core.rationale_min_length).toBe(80);
    expect(config.policyOverrides.waiver.friction.conditional.rationale_min_length).toBe(40);
    expect(config.policyOverrides.waiver.friction.supplemental.rationale_min_length).toBe(20);
    // Policy overrides: no-go blocks.
    expect(config.policyOverrides.gate.allow_no_go_continue).toBe(false);
  });

  it("PMI_AGILE is ITERATIVE + BACKLOG_GOVERNED + RELEASE_BASED", () => {
    const config = getTrackPolicy(GovernanceTrack.PMI_AGILE);
    expect(config.gateMode).toBe(GateMode.ITERATIVE);
    expect(config.changeControlMode).toBe(ChangeControlMode.BACKLOG_GOVERNED);
    expect(config.baselineLocking).toBe(false);
    expect(config.gateEnforcementLevel).toBe(GateEnforcementLevel.RELEASE_BASED);
    expect(config.iterativePhaseIds).toEqual([2, 3, 4]);
  });

  it("CPMAI has no policy overrides (uses defaults)", () => {
    const config = getTrackPolicy(GovernanceTrack.CPMAI);
    expect(config.policyOverrides).toBeNull();
    expect(config.gateMode).toBe(GateMode.SEQUENTIAL);
  });
});
