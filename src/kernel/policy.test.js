import { describe, it, expect } from "vitest";
import { compilePolicy, resolveConstraint, resolveWaiverMinLength, revisePolicy } from "./policy.js";
import { DEFAULT_POLICY, validatePolicy, hashPolicy } from "./policySchema.js";
import { enforcePolicy, PolicyAction } from "./policyEnforcer.js";

// ---------------------------------------------------------------------------
// Policy schema
// ---------------------------------------------------------------------------

describe("DEFAULT_POLICY", () => {
  it("has version 1", () => {
    expect(DEFAULT_POLICY.version).toBe(1);
  });

  it("waiver rationale minimum is 20", () => {
    expect(DEFAULT_POLICY.waiver.rationale_min_length).toBe(20);
  });

  it("solo attestation minimum is 30", () => {
    expect(DEFAULT_POLICY.gate.solo_attestation_min_length).toBe(30);
  });

  it("non-templated completion minimum is 20", () => {
    expect(DEFAULT_POLICY.artifact.non_templated_completion_min_length).toBe(20);
  });

  it("max snapshots is 5", () => {
    expect(DEFAULT_POLICY.history.max_snapshots).toBe(5);
  });

  it("max waivers per phase is null (unlimited)", () => {
    expect(DEFAULT_POLICY.waiver.max_per_phase).toBeNull();
  });

  it("allows no-go continue by default", () => {
    expect(DEFAULT_POLICY.gate.allow_no_go_continue).toBe(true);
  });
});

describe("validatePolicy", () => {
  it("validates the default policy", () => {
    const result = validatePolicy(DEFAULT_POLICY);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects non-object policy", () => {
    expect(validatePolicy(null).valid).toBe(false);
    expect(validatePolicy("string").valid).toBe(false);
  });

  it("rejects invalid version", () => {
    const result = validatePolicy({ ...DEFAULT_POLICY, version: 0 });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("version");
  });

  it("rejects fractional rationale min length", () => {
    const result = validatePolicy({
      ...DEFAULT_POLICY,
      waiver: { ...DEFAULT_POLICY.waiver, rationale_min_length: 2.5 },
    });
    expect(result.valid).toBe(false);
  });

  it("rejects negative max_per_phase", () => {
    const result = validatePolicy({
      ...DEFAULT_POLICY,
      waiver: { ...DEFAULT_POLICY.waiver, max_per_phase: -1 },
    });
    expect(result.valid).toBe(false);
  });
});

describe("hashPolicy", () => {
  it("produces a 64-character hex string", () => {
    const hash = hashPolicy(DEFAULT_POLICY);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces different hashes for different policies", () => {
    const hash1 = hashPolicy(DEFAULT_POLICY);
    const hash2 = hashPolicy({ ...DEFAULT_POLICY, version: 2 });
    expect(hash1).not.toBe(hash2);
  });

  it("produces the same hash for the same policy", () => {
    const hash1 = hashPolicy(DEFAULT_POLICY);
    const hash2 = hashPolicy(DEFAULT_POLICY);
    expect(hash1).toBe(hash2);
  });
});

// ---------------------------------------------------------------------------
// Policy compilation
// ---------------------------------------------------------------------------

describe("compilePolicy", () => {
  it("returns the default policy when called with no overrides", () => {
    const { policy, valid } = compilePolicy();
    expect(valid).toBe(true);
    expect(policy.version).toBe(1);
    expect(policy.waiver.rationale_min_length).toBe(20);
  });

  it("merges overrides onto defaults", () => {
    const { policy, valid } = compilePolicy({
      waiver: { rationale_min_length: 40 },
    });
    expect(valid).toBe(true);
    expect(policy.waiver.rationale_min_length).toBe(40);
    // Non-overridden fields keep defaults
    expect(policy.waiver.max_per_phase).toBeNull();
    expect(policy.gate.solo_attestation_min_length).toBe(30);
  });

  it("deep merges nested objects", () => {
    const { policy } = compilePolicy({
      waiver: { friction: { core: { rationale_min_length: 80 } } },
    });
    expect(policy.waiver.friction.core.rationale_min_length).toBe(80);
    // Other friction tiers unchanged
    expect(policy.waiver.friction.supplemental.rationale_min_length).toBe(20);
  });

  it("returns a hash with each compilation", () => {
    const { hash } = compilePolicy();
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ---------------------------------------------------------------------------
// Constraint resolution
// ---------------------------------------------------------------------------

describe("resolveConstraint", () => {
  it("resolves a top-level path from default policy", () => {
    expect(resolveConstraint(null, "version")).toBe(1);
  });

  it("resolves a nested path", () => {
    expect(resolveConstraint(null, "waiver.rationale_min_length")).toBe(20);
  });

  it("resolves from custom policy", () => {
    const { policy } = compilePolicy({ waiver: { rationale_min_length: 50 } });
    expect(resolveConstraint(policy, "waiver.rationale_min_length")).toBe(50);
  });

  it("falls back to default for missing paths", () => {
    const sparse = { version: 2 };
    expect(resolveConstraint(sparse, "waiver.rationale_min_length")).toBe(20);
  });
});

describe("resolveWaiverMinLength", () => {
  it("returns 20 for default policy with no category", () => {
    expect(resolveWaiverMinLength(null)).toBe(20);
  });

  it("returns category-specific friction when set", () => {
    const { policy } = compilePolicy({
      waiver: { friction: { core: { rationale_min_length: 80 } } },
    });
    expect(resolveWaiverMinLength(policy, "core")).toBe(80);
    expect(resolveWaiverMinLength(policy, "supplemental")).toBe(20);
  });

  it("falls back to global when category friction is not set", () => {
    const { policy } = compilePolicy({ waiver: { rationale_min_length: 30 } });
    // supplemental friction is still 20 from defaults because friction overrides
    // take precedence. But if we ask for an unknown category...
    expect(resolveWaiverMinLength(policy)).toBe(30);
  });
});

// ---------------------------------------------------------------------------
// Policy revision
// ---------------------------------------------------------------------------

describe("revisePolicy", () => {
  it("increments the version", () => {
    const { policy } = revisePolicy(DEFAULT_POLICY, { waiver: { rationale_min_length: 30 } });
    expect(policy.version).toBe(2);
  });

  it("merges changes", () => {
    const { policy } = revisePolicy(DEFAULT_POLICY, { waiver: { rationale_min_length: 30 } });
    expect(policy.waiver.rationale_min_length).toBe(30);
  });

  it("returns previous version number", () => {
    const result = revisePolicy(DEFAULT_POLICY, {});
    expect(result.previousVersion).toBe(1);
  });

  it("validates the revised policy", () => {
    const result = revisePolicy(DEFAULT_POLICY, { version: -1 });
    // Version gets overwritten by version+1, so it should be valid
    expect(result.policy.version).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Policy enforcement
// ---------------------------------------------------------------------------

describe("enforcePolicy", () => {
  it("allows actions with no type", () => {
    expect(enforcePolicy({}, null).allowed).toBe(true);
  });

  it("allows unknown action types", () => {
    expect(enforcePolicy({ type: "UNKNOWN" }, null).allowed).toBe(true);
  });

  describe("waiver enforcement", () => {
    it("allows waiver with sufficient rationale", () => {
      const result = enforcePolicy({
        type: PolicyAction.APPLY_WAIVER,
        rationale: "This artifact is not applicable to our use case at all",
      }, null);
      expect(result.allowed).toBe(true);
    });

    it("blocks waiver with insufficient rationale", () => {
      const result = enforcePolicy({
        type: PolicyAction.APPLY_WAIVER,
        rationale: "too short",
      }, null);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("20");
    });

    it("respects custom rationale min length", () => {
      const { policy } = compilePolicy({ waiver: { rationale_min_length: 5 } });
      const result = enforcePolicy({
        type: PolicyAction.APPLY_WAIVER,
        rationale: "valid",
      }, policy);
      expect(result.allowed).toBe(true);
    });

    it("enforces waiver budget when set", () => {
      const { policy } = compilePolicy({ waiver: { max_per_phase: 2 } });
      const result = enforcePolicy({
        type: PolicyAction.APPLY_WAIVER,
        rationale: "This artifact is not applicable to our context at all",
        phaseWaiverCount: 2,
      }, policy);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("budget");
    });

    it("allows waiver when under budget", () => {
      const { policy } = compilePolicy({ waiver: { max_per_phase: 3 } });
      const result = enforcePolicy({
        type: PolicyAction.APPLY_WAIVER,
        rationale: "This artifact is not applicable to our context at all",
        phaseWaiverCount: 2,
      }, policy);
      expect(result.allowed).toBe(true);
    });
  });

  describe("gate decision enforcement", () => {
    it("allows team mode go decision without notes", () => {
      const result = enforcePolicy({
        type: PolicyAction.DECIDE_GATE,
        decision: "go",
        governanceMode: "team",
        notes: "",
      }, null);
      expect(result.allowed).toBe(true);
    });

    it("blocks solo mode go decision with insufficient attestation", () => {
      const result = enforcePolicy({
        type: PolicyAction.DECIDE_GATE,
        decision: "go",
        governanceMode: "solo",
        notes: "too short",
      }, null);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("30");
    });

    it("allows solo mode go decision with sufficient attestation", () => {
      const result = enforcePolicy({
        type: PolicyAction.DECIDE_GATE,
        decision: "go",
        governanceMode: "solo",
        notes: "I have reviewed all artifacts and they meet the required quality bar for this phase",
      }, null);
      expect(result.allowed).toBe(true);
    });

    it("blocks go after no-go when policy disallows continuation", () => {
      const { policy } = compilePolicy({ gate: { allow_no_go_continue: false } });
      const result = enforcePolicy({
        type: PolicyAction.DECIDE_GATE,
        decision: "go",
        governanceMode: "team",
        hasPriorNoGo: true,
      }, policy);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("no-go");
    });

    it("allows go after no-go when policy allows continuation", () => {
      const result = enforcePolicy({
        type: PolicyAction.DECIDE_GATE,
        decision: "go",
        governanceMode: "team",
        hasPriorNoGo: true,
      }, null);
      expect(result.allowed).toBe(true);
    });
  });
});
