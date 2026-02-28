import { describe, it, expect } from "vitest";
import {
  Capability,
  ActorType,
  getCapabilities,
  hasCapability,
  requiredCapability,
} from "./capabilities.js";
import { checkAccess, resolveActorType } from "./access.js";
import { processAction, PipelineResult } from "./scheduler.js";

// ---------------------------------------------------------------------------
// Capability definitions
// ---------------------------------------------------------------------------

describe("Capability constants", () => {
  it("defines governance, artifact, advisory, and ledger capabilities", () => {
    expect(Capability.GOVERNANCE_GATE_DECIDE).toBe("governance.gate.decide");
    expect(Capability.GOVERNANCE_WAIVER_APPLY).toBe("governance.waiver.apply");
    expect(Capability.ARTIFACT_WRITE).toBe("artifact.write");
    expect(Capability.ADVISORY_SUBMIT).toBe("advisory.submit");
    expect(Capability.LEDGER_READ).toBe("ledger.read");
  });
});

// ---------------------------------------------------------------------------
// Capability profiles
// ---------------------------------------------------------------------------

describe("getCapabilities", () => {
  it("gives humans full capabilities including governance", () => {
    const caps = getCapabilities(ActorType.HUMAN);
    expect(caps).toContain(Capability.GOVERNANCE_GATE_DECIDE);
    expect(caps).toContain(Capability.GOVERNANCE_WAIVER_APPLY);
    expect(caps).toContain(Capability.ARTIFACT_WRITE);
    expect(caps).toContain(Capability.ADVISORY_SUBMIT);
  });

  it("gives agents advisory-only capabilities", () => {
    const caps = getCapabilities(ActorType.AGENT);
    expect(caps).toContain(Capability.ADVISORY_SUBMIT);
    expect(caps).toContain(Capability.ARTIFACT_READ);
    expect(caps).toContain(Capability.LEDGER_READ);
    expect(caps).not.toContain(Capability.GOVERNANCE_GATE_DECIDE);
    expect(caps).not.toContain(Capability.GOVERNANCE_WAIVER_APPLY);
    expect(caps).not.toContain(Capability.ARTIFACT_WRITE);
  });

  it("returns empty set for unknown actor types", () => {
    expect(getCapabilities("robot")).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Capability checking
// ---------------------------------------------------------------------------

describe("hasCapability", () => {
  it("returns true when capability is present", () => {
    expect(hasCapability([Capability.ADVISORY_SUBMIT], Capability.ADVISORY_SUBMIT)).toBe(true);
  });

  it("returns false when capability is absent", () => {
    expect(hasCapability([Capability.ADVISORY_SUBMIT], Capability.GOVERNANCE_GATE_DECIDE)).toBe(false);
  });

  it("returns false for null/undefined capabilities", () => {
    expect(hasCapability(null, Capability.ADVISORY_SUBMIT)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Action-to-capability mapping
// ---------------------------------------------------------------------------

describe("requiredCapability", () => {
  it("maps APPLY_WAIVER to governance.waiver.apply", () => {
    expect(requiredCapability("APPLY_WAIVER")).toBe(Capability.GOVERNANCE_WAIVER_APPLY);
  });

  it("maps DECIDE_GATE to governance.gate.decide", () => {
    expect(requiredCapability("DECIDE_GATE")).toBe(Capability.GOVERNANCE_GATE_DECIDE);
  });

  it("maps SUBMIT_ADVISORY to advisory.submit", () => {
    expect(requiredCapability("SUBMIT_ADVISORY")).toBe(Capability.ADVISORY_SUBMIT);
  });

  it("returns null for unrestricted actions", () => {
    expect(requiredCapability("HEARTBEAT")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Access control (checkAccess)
// ---------------------------------------------------------------------------

describe("checkAccess", () => {
  it("allows humans to decide gates", () => {
    const result = checkAccess({
      actorType: ActorType.HUMAN,
      actionType: "DECIDE_GATE",
    });
    expect(result.allowed).toBe(true);
  });

  it("denies agents gate decisions", () => {
    const result = checkAccess({
      actorType: ActorType.AGENT,
      actionType: "DECIDE_GATE",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("governance.gate.decide");
  });

  it("allows agents to submit advisories", () => {
    const result = checkAccess({
      actorType: ActorType.AGENT,
      actionType: "SUBMIT_ADVISORY",
    });
    expect(result.allowed).toBe(true);
  });

  it("denies agents waiver application", () => {
    const result = checkAccess({
      actorType: ActorType.AGENT,
      actionType: "APPLY_WAIVER",
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain("governance.waiver.apply");
  });

  it("allows unrestricted actions for any actor type", () => {
    const result = checkAccess({
      actorType: ActorType.AGENT,
      actionType: "HEARTBEAT",
    });
    expect(result.allowed).toBe(true);
  });

  it("supports custom capability overrides", () => {
    // Agent with explicitly granted gate capability
    const result = checkAccess({
      actorType: ActorType.AGENT,
      capabilities: [Capability.GOVERNANCE_GATE_DECIDE],
      actionType: "DECIDE_GATE",
    });
    expect(result.allowed).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Actor type resolution
// ---------------------------------------------------------------------------

describe("resolveActorType", () => {
  it("resolves agent: prefix as agent", () => {
    expect(resolveActorType("agent:openai-o1")).toBe(ActorType.AGENT);
  });

  it("resolves openclaw: prefix as agent", () => {
    expect(resolveActorType("openclaw:drafter")).toBe(ActorType.AGENT);
  });

  it("resolves human: prefix as human", () => {
    expect(resolveActorType("human:user-123")).toBe(ActorType.HUMAN);
    expect(resolveActorType("human:nikodemus")).toBe(ActorType.HUMAN);
  });

  it("defaults unknown prefixes to agent (fail-closed, lowest privilege)", () => {
    expect(resolveActorType("user-123")).toBe(ActorType.AGENT);
    expect(resolveActorType("unknown")).toBe(ActorType.AGENT);
  });

  it("respects explicit type override", () => {
    expect(resolveActorType("agent:foo", ActorType.HUMAN)).toBe(ActorType.HUMAN);
  });
});

// ---------------------------------------------------------------------------
// Pipeline integration — scheduler uses capability check
// ---------------------------------------------------------------------------

describe("scheduler capability enforcement", () => {
  it("denies agent gate decision through the pipeline", () => {
    const action = {
      type: "DECIDE_GATE",
      agentId: "agent:drafter",
      policyAction: { type: "DECIDE_GATE", decision: "go", notes: "Some attestation notes here for testing", governanceMode: "solo" },
      payload: { phase_id: 1, decision: "go" },
    };

    const result = processAction(action, { ledger: [] });
    expect(result.result).toBe(PipelineResult.CAPABILITY_DENIED);
    expect(result.reason).toContain("governance.gate.decide");
  });

  it("allows human gate decision through the pipeline", () => {
    const action = {
      type: "DECIDE_GATE",
      agentId: "human:user-1",
      policyAction: { type: "DECIDE_GATE", decision: "go", notes: "This gate is ready, I have reviewed all artifacts thoroughly", governanceMode: "solo" },
      payload: { phase_id: 1, decision: "go" },
    };

    const result = processAction(action, { ledger: [] });
    expect(result.result).toBe(PipelineResult.OK);
  });

  it("logs OVERRIDE_ATTEMPTED when agent capability is denied", () => {
    const action = {
      type: "APPLY_WAIVER",
      agentId: "agent:helper",
      policyAction: { type: "APPLY_WAIVER", rationale: "This artifact should be waived because it is not applicable" },
      payload: { artifact_id: "a1" },
    };

    const result = processAction(action, { ledger: [] });
    expect(result.result).toBe(PipelineResult.CAPABILITY_DENIED);
    // Check that OVERRIDE_ATTEMPTED was appended to the ledger.
    expect(result.ledger.length).toBe(1);
    expect(result.ledger[0].type).toBe("OVERRIDE_ATTEMPTED");
    expect(result.ledger[0].payload.denied_capability).toBe("governance.waiver.apply");
    expect(result.ledger[0].payload.actor_type).toBe("agent");
  });

  it("allows agent advisory submission through the pipeline", () => {
    const action = {
      type: "SUBMIT_ADVISORY",
      agentId: "agent:drafter",
      payload: { draft: "Some advisory content" },
    };

    const result = processAction(action, { ledger: [] });
    expect(result.result).toBe(PipelineResult.OK);
  });
});
