import { describe, it, expect } from "vitest";
import { isGateReady } from "./gateLogic.js";

// Helper: a valid waiver with >= 20 non-whitespace chars in the rationale.
function validWaiver(rationale = "This artifact is waived for a documented reason.") {
  return { waived: true, rationale };
}

// Helper: build a minimal phase object.
function makePhase(artifacts = [], id = 1) {
  return { id, artifacts };
}

// Helper: a gate-blocking artifact with optional overrides.
function blockingArtifact(overrides = {}) {
  return { name: "Blocker", isGateBlocking: true, ...overrides };
}

// Helper: a non-gate-blocking artifact with optional overrides.
function nonBlockingArtifact(overrides = {}) {
  return { name: "Info", isGateBlocking: false, ...overrides };
}

describe("isGateReady", () => {
  it("returns true when phase has no artifacts", () => {
    const phase = makePhase([]);
    expect(isGateReady(phase)).toBe(true);
  });

  it("returns true when phase has no gate-blocking artifacts", () => {
    const phase = makePhase([
      nonBlockingArtifact(),
      nonBlockingArtifact({ name: "Another info artifact" }),
    ]);
    expect(isGateReady(phase)).toBe(true);
  });

  it("returns false when a gate-blocking artifact is incomplete and not waived", () => {
    const phase = makePhase([
      blockingArtifact(), // no waiver, no rationale/notes content
    ]);
    expect(isGateReady(phase)).toBe(false);
  });

  it("returns true when all gate-blocking artifacts are waived (20+ char rationale)", () => {
    const phase = makePhase([
      blockingArtifact({ waiver: validWaiver() }),
      blockingArtifact({ waiver: validWaiver("Another valid reason that is long enough") }),
    ]);
    expect(isGateReady(phase)).toBe(true);
  });

  it("returns false when waiver rationale is too short", () => {
    const phase = makePhase([
      blockingArtifact({
        waiver: { waived: true, rationale: "too short" }, // < 20 chars
      }),
    ]);
    expect(isGateReady(phase)).toBe(false);
  });

  it("returns true when gate-blocking artifact has enough written content (non-templated)", () => {
    // No template_id means the non-templated fallback is used:
    // artifact.rationale or artifact.notes must have >= 20 chars.
    const phase = makePhase([
      blockingArtifact({
        rationale: "This is a sufficiently detailed rationale for the artifact.",
      }),
    ]);
    expect(isGateReady(phase)).toBe(true);
  });

  it("returns true when gate-blocking artifact has enough notes content (non-templated)", () => {
    const phase = makePhase([
      blockingArtifact({
        notes: "Enough notes content to satisfy the 20-char minimum.",
      }),
    ]);
    expect(isGateReady(phase)).toBe(true);
  });

  it("handles null phase gracefully", () => {
    expect(isGateReady(null)).toBe(true);
  });

  it("handles undefined phase gracefully", () => {
    expect(isGateReady(undefined)).toBe(true);
  });

  it("handles phase with undefined artifacts gracefully", () => {
    expect(isGateReady({ id: 1 })).toBe(true);
  });

  it("ignores non-blocking artifacts when determining gate readiness", () => {
    // Mix of blocking (complete) and non-blocking (incomplete) artifacts.
    const phase = makePhase([
      blockingArtifact({ waiver: validWaiver() }),
      nonBlockingArtifact(), // incomplete but not gate-blocking
    ]);
    expect(isGateReady(phase)).toBe(true);
  });

  it("returns false if any single gate-blocking artifact is incomplete among otherwise complete ones", () => {
    const phase = makePhase([
      blockingArtifact({ waiver: validWaiver() }),
      blockingArtifact(), // incomplete, no waiver, no content
      blockingArtifact({
        rationale: "A detailed enough rationale that passes the check.",
      }),
    ]);
    expect(isGateReady(phase)).toBe(false);
  });

  it("returns false when waiver.waived is false even with long rationale", () => {
    const phase = makePhase([
      blockingArtifact({
        waiver: { waived: false, rationale: "This rationale is long enough but waived is false" },
      }),
    ]);
    expect(isGateReady(phase)).toBe(false);
  });

  it("returns false when rationale/notes are whitespace-padded below 20 real chars", () => {
    const phase = makePhase([
      blockingArtifact({
        rationale: "   short   ", // trimmed length < 20
      }),
    ]);
    expect(isGateReady(phase)).toBe(false);
  });
});
