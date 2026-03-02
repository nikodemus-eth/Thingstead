import { describe, it, expect } from "vitest";
import { isGateReady } from "./gateEvaluator.js";
import { GateMode, GateEnforcementLevel } from "./governanceTracks.js";

// Stub template resolver — returns "complete" binding for all artifacts.
const resolveComplete = () => ({
  template: null,
  binding: { status: "verified" },
});

// Stub template resolver — returns "incomplete" binding for all artifacts.
const resolveIncomplete = () => ({
  template: { required_fields: [{ id: "f1", label: "Field 1" }] },
  binding: { status: "unresolved" },
});

// Helper: creates a phase with one gate-blocking artifact.
function makePhase(id, { complete = false, waived = false } = {}) {
  return {
    id,
    artifacts: [
      {
        id: `art-${id}`,
        isGateBlocking: true,
        waiver: waived ? { waived: true, rationale: "Valid rationale that is long enough for testing" } : null,
        status: complete ? "complete" : "not-started",
        notes: complete ? "Completed with sufficient detail" : "",
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Standard sequential evaluation (no trackPolicy)
// ---------------------------------------------------------------------------

describe("isGateReady — sequential (default)", () => {
  it("returns true when all gate-blocking artifacts are complete", () => {
    const phase = makePhase(1, { complete: true });
    expect(isGateReady(phase, resolveComplete)).toBe(true);
  });

  it("returns false when gate-blocking artifact is incomplete", () => {
    const phase = makePhase(1);
    expect(isGateReady(phase, resolveIncomplete)).toBe(false);
  });

  it("returns true when gate-blocking artifact is waived", () => {
    const phase = makePhase(1, { waived: true });
    expect(isGateReady(phase, resolveIncomplete)).toBe(true);
  });

  it("returns true for phase with no artifacts", () => {
    expect(isGateReady({ id: 1, artifacts: [] }, resolveIncomplete)).toBe(true);
  });

  it("backward compatible: 3-arg call works identically", () => {
    const phase = makePhase(1, { complete: true });
    expect(isGateReady(phase, resolveComplete, null)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Track-aware evaluation
// ---------------------------------------------------------------------------

describe("isGateReady — track-aware", () => {
  const waterfallTrack = {
    gateMode: GateMode.SEQUENTIAL,
    gateEnforcementLevel: GateEnforcementLevel.STRICT,
    iterativePhaseIds: null,
  };

  const agileTrack = {
    gateMode: GateMode.ITERATIVE,
    gateEnforcementLevel: GateEnforcementLevel.RELEASE_BASED,
    iterativePhaseIds: [2, 3, 4],
  };

  it("waterfall strict blocks incomplete artifacts", () => {
    const phase = makePhase(1);
    expect(isGateReady(phase, resolveIncomplete, null, waterfallTrack)).toBe(false);
  });

  it("waterfall strict allows complete artifacts", () => {
    const phase = makePhase(1, { complete: true });
    expect(isGateReady(phase, resolveComplete, null, waterfallTrack)).toBe(true);
  });

  it("agile iterative phase is always ready (sprint loop)", () => {
    // Phase 2 is in iterativePhaseIds — should return true regardless of artifacts.
    const phase = makePhase(2);
    expect(isGateReady(phase, resolveIncomplete, null, agileTrack)).toBe(true);
  });

  it("agile release gate (phase 5) enforces completeness", () => {
    // Phase 5 is NOT in iterativePhaseIds — standard evaluation applies.
    const phase = makePhase(5);
    expect(isGateReady(phase, resolveIncomplete, null, agileTrack)).toBe(false);
  });

  it("agile release gate allows when complete", () => {
    const phase = makePhase(5, { complete: true });
    expect(isGateReady(phase, resolveComplete, null, agileTrack)).toBe(true);
  });
});
