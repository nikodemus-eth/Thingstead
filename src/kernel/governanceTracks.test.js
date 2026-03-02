import { describe, it, expect } from "vitest";
import {
  GovernanceTrack,
  GateMode,
  ChangeControlMode,
  GateEnforcementLevel,
} from "./governanceTracks.js";

describe("GovernanceTrack", () => {
  it("defines all four tracks", () => {
    expect(GovernanceTrack.CPMAI).toBe("CPMAI");
    expect(GovernanceTrack.CPMAI_PLUS).toBe("CPMAI_PLUS");
    expect(GovernanceTrack.PMI_WATERFALL).toBe("PMI_WATERFALL");
    expect(GovernanceTrack.PMI_AGILE).toBe("PMI_AGILE");
  });

  it("is frozen", () => {
    expect(Object.isFrozen(GovernanceTrack)).toBe(true);
  });
});

describe("GateMode", () => {
  it("defines SEQUENTIAL and ITERATIVE", () => {
    expect(GateMode.SEQUENTIAL).toBe("SEQUENTIAL");
    expect(GateMode.ITERATIVE).toBe("ITERATIVE");
  });

  it("is frozen", () => {
    expect(Object.isFrozen(GateMode)).toBe(true);
  });
});

describe("ChangeControlMode", () => {
  it("defines all three modes", () => {
    expect(ChangeControlMode.INFORMAL).toBe("INFORMAL");
    expect(ChangeControlMode.FORMAL_CCB).toBe("FORMAL_CCB");
    expect(ChangeControlMode.BACKLOG_GOVERNED).toBe("BACKLOG_GOVERNED");
  });
});

describe("GateEnforcementLevel", () => {
  it("defines STRICT and RELEASE_BASED", () => {
    expect(GateEnforcementLevel.STRICT).toBe("STRICT");
    expect(GateEnforcementLevel.RELEASE_BASED).toBe("RELEASE_BASED");
  });
});
