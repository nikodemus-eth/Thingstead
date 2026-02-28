/**
 * Bypass attempt tests — adversarial red-team validation.
 *
 * These tests verify that the kernel's fail-closed invariants hold
 * under deliberate attempts to bypass governance controls.
 */
import { describe, it, expect } from "vitest";
import { appendEntry, createGenesisEntry, verifyLedgerIntegrity, LedgerEventType } from "./ledger.js";
import { generateGateProof } from "./gateProof.js";
import { bindProofToPayload, verifyProof, verifyEvidenceBinding } from "./evidence.js";
import { enforcePolicy, PolicyAction } from "./policyEnforcer.js";
import { checkAccess, resolveActorType } from "./access.js";
import { processAction, PipelineResult } from "./scheduler.js";
import { ActorType, Capability, requiredCapability } from "./capabilities.js";
import { BindingStatus } from "./types.js";

// ---------------------------------------------------------------------------
// 1. Bypass attempt: raw ledger/proof forgery outside the pipeline
// ---------------------------------------------------------------------------

describe("bypass: raw ledger and proof forgery", () => {
  it("appendEntry can mint ledger entries without access or policy checks", () => {
    // This demonstrates WHY appendEntry is in _unsafe:
    // anyone with access to it can write arbitrary governance events.
    const { ledger } = appendEntry([], "GATE_DECIDED", {
      phase_id: 1,
      decision: "go",
      notes: "",
    }, "attacker");

    // The entry itself is structurally valid...
    expect(ledger.length).toBe(1);
    expect(verifyLedgerIntegrity(ledger).valid).toBe(true);

    // ...but it was never capability-checked or policy-checked.
    // The pipeline would have caught:
    // 1. "attacker" resolves as agent (no human: prefix) → CAPABILITY_DENIED
    // 2. Missing solo attestation notes → POLICY_BLOCKED
    const pipelineResult = processAction(
      {
        type: "DECIDE_GATE",
        agentId: "attacker",
        policyAction: {
          type: PolicyAction.DECIDE_GATE,
          decision: "go",
          notes: "",
          governanceMode: "solo",
        },
      },
      { ledger: [] }
    );
    expect(pipelineResult.result).toBe(PipelineResult.CAPABILITY_DENIED);
  });

  it("generateGateProof can mint proofs about arbitrary states", () => {
    // Forge a proof for a phase with no real artifacts
    const fakePhase = {
      id: 999,
      name: "Fake Phase",
      artifacts: [],
    };
    const proof = generateGateProof(
      fakePhase,
      () => ({ template: null, binding: BindingStatus.MISSING }),
      null,
      { status: "go" },
      "attacker"
    );

    // Proof is structurally valid and verifies against itself...
    expect(verifyProof(proof).valid).toBe(true);

    // ...but going through the pipeline, the actor would be denied
    const result = processAction(
      {
        type: "DECIDE_GATE",
        agentId: "attacker",
        policyAction: { type: PolicyAction.DECIDE_GATE, decision: "go", notes: "", governanceMode: "solo" },
      },
      { ledger: [] }
    );
    expect(result.result).toBe(PipelineResult.CAPABILITY_DENIED);
  });

  it("forged proof not bound to ledger is detectable", () => {
    const fakePhase = { id: 1, artifacts: [] };
    const proof = generateGateProof(
      fakePhase,
      () => ({ template: null, binding: BindingStatus.MISSING }),
      null,
      { status: "go" },
      "attacker"
    );

    // Create a ledger entry with a DIFFERENT proof hash
    const fakeLedgerEntry = {
      payload: { proof_hash: "0000000000000000000000000000000000000000000000000000000000000000" },
    };
    const binding = verifyEvidenceBinding(fakeLedgerEntry, proof);
    expect(binding.valid).toBe(false);
    expect(binding.error).toContain("does not match");
  });
});

// ---------------------------------------------------------------------------
// 2. Unknown actor privilege test
// ---------------------------------------------------------------------------

describe("bypass: unknown actor privilege escalation", () => {
  it("unknown actor ID defaults to agent (lowest privilege)", () => {
    expect(resolveActorType("random-string")).toBe(ActorType.AGENT);
    expect(resolveActorType("admin")).toBe(ActorType.AGENT);
    expect(resolveActorType("root")).toBe(ActorType.AGENT);
    expect(resolveActorType("")).toBe(ActorType.AGENT);
  });

  it("unknown actor cannot decide gates through the pipeline", () => {
    const result = processAction(
      {
        type: "DECIDE_GATE",
        agentId: "unknown-actor",
        policyAction: {
          type: PolicyAction.DECIDE_GATE,
          decision: "go",
          notes: "I have thoroughly reviewed all artifacts and attest they are complete",
          governanceMode: "solo",
        },
      },
      { ledger: [] }
    );
    expect(result.result).toBe(PipelineResult.CAPABILITY_DENIED);
    expect(result.reason).toContain("governance.gate.decide");
  });

  it("unknown actor cannot apply waivers through the pipeline", () => {
    const result = processAction(
      {
        type: "APPLY_WAIVER",
        agentId: "mystery-user",
        policyAction: {
          type: PolicyAction.APPLY_WAIVER,
          rationale: "This artifact is not applicable to our project scope at all, truly",
        },
      },
      { ledger: [] }
    );
    expect(result.result).toBe(PipelineResult.CAPABILITY_DENIED);
    expect(result.reason).toContain("governance.waiver.apply");
  });

  it("only human: prefix grants human capabilities", () => {
    expect(resolveActorType("human:alice")).toBe(ActorType.HUMAN);

    const result = processAction(
      {
        type: "DECIDE_GATE",
        agentId: "human:alice",
        policyAction: {
          type: PolicyAction.DECIDE_GATE,
          decision: "go",
          notes: "I have thoroughly reviewed all artifacts and attest they are complete",
          governanceMode: "solo",
        },
      },
      { ledger: [] }
    );
    expect(result.result).toBe(PipelineResult.OK);
  });

  it("invalid explicitType falls through to prefix-based resolution", () => {
    // explicitType must be exactly ActorType.HUMAN or ActorType.AGENT
    expect(resolveActorType("attacker", "superadmin")).toBe(ActorType.AGENT);
    expect(resolveActorType("attacker", "HUMAN")).toBe(ActorType.AGENT); // case-sensitive
  });
});

// ---------------------------------------------------------------------------
// 3. Unknown action type test
// ---------------------------------------------------------------------------

describe("bypass: unknown action types", () => {
  it("enforcePolicy denies unknown action types", () => {
    const result = enforcePolicy({ type: "FORGE_GATE" }, null);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("Unknown policy action type");
  });

  it("enforcePolicy denies null action", () => {
    expect(enforcePolicy(null, null).allowed).toBe(false);
  });

  it("enforcePolicy denies action with empty type", () => {
    expect(enforcePolicy({ type: "" }, null).allowed).toBe(false);
  });

  it("requiredCapability returns UNKNOWN_ACTION sentinel for unknown types", () => {
    expect(requiredCapability("FORGE_GATE")).toBe(Capability.UNKNOWN_ACTION);
    expect(requiredCapability("")).toBe(Capability.UNKNOWN_ACTION);
  });

  it("unknown action type is denied at capability check (no actor has UNKNOWN_ACTION)", () => {
    const humanCheck = checkAccess({
      actorType: ActorType.HUMAN,
      actionType: "FORGE_GATE",
    });
    expect(humanCheck.allowed).toBe(false);
    expect(humanCheck.reason).toContain("system.unknown_action");

    const agentCheck = checkAccess({
      actorType: ActorType.AGENT,
      actionType: "FORGE_GATE",
    });
    expect(agentCheck.allowed).toBe(false);
  });

  it("unknown action type denied through full pipeline", () => {
    const result = processAction(
      {
        type: "FORGE_GATE",
        agentId: "human:alice",
        payload: {},
      },
      { ledger: [] }
    );
    expect(result.result).toBe(PipelineResult.CAPABILITY_DENIED);
    expect(result.reason).toContain("system.unknown_action");
  });
});

// ---------------------------------------------------------------------------
// 4. Genesis uniqueness constraints
// ---------------------------------------------------------------------------

describe("bypass: genesis entry constraints", () => {
  it("genesis entry always has sequence 0 and genesis prev_hash", () => {
    const genesis = createGenesisEntry("PROJECT_CREATED", { project_id: "p1" }, "actor1");
    expect(genesis.sequence).toBe(0);
    expect(genesis.prev_hash).toBe("0000000000000000000000000000000000000000000000000000000000000000");
  });

  it("appendEntry to empty ledger creates genesis automatically", () => {
    const { ledger } = appendEntry([], "PROJECT_CREATED", { project_id: "p1" }, "actor1");
    expect(ledger[0].sequence).toBe(0);
  });

  it("verifyLedgerIntegrity rejects non-genesis first entry", () => {
    // Manually craft a ledger where the first entry has wrong prev_hash
    const badGenesis = {
      sequence: 0,
      type: "PROJECT_CREATED",
      payload: {},
      timestamp: new Date().toISOString(),
      actor_id: "actor1",
      prev_hash: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      hash: "dummy",
    };
    const result = verifyLedgerIntegrity([badGenesis]);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("non-zero prev_hash");
  });

  it("verifyLedgerIntegrity rejects duplicate sequences", () => {
    const { ledger: l1 } = appendEntry([], "PROJECT_CREATED", {}, "a");
    const { entry: e2 } = appendEntry(l1, "WAIVER_APPLIED", {}, "a");
    // Tamper: duplicate the first entry's sequence
    const tampered = [l1[0], { ...e2, sequence: 0 }];
    const result = verifyLedgerIntegrity(tampered);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("Sequence gap");
  });

  it("verifyLedgerIntegrity rejects timestamp regression", () => {
    const { ledger: l1 } = appendEntry([], "PROJECT_CREATED", {}, "a", "2026-01-02T00:00:00Z");
    // Try to append with earlier timestamp — appendEntry itself throws
    expect(() => {
      appendEntry(l1, "WAIVER_APPLIED", {}, "a", "2026-01-01T00:00:00Z");
    }).toThrow("timestamp violation");
  });
});
