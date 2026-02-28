import { describe, it, expect } from "vitest";
import { processAction, processBatch, PipelineResult } from "./scheduler.js";
import { PolicyAction } from "./policyEnforcer.js";
import { compilePolicy } from "./policy.js";

describe("processAction", () => {
  it("approves agent advisory submissions", () => {
    // Agents can submit advisories — this is their core allowed action.
    const result = processAction({ type: "SUBMIT_ADVISORY", agentId: "agent:a1", payload: {} });
    expect(result.result).toBe(PipelineResult.OK);
    expect(result.reason).toBeNull();
  });

  it("blocks human actions that violate policy", () => {
    // Human actors reach policy check (capability passes), but policy rejects short rationale.
    const { policy } = compilePolicy({ waiver: { rationale_min_length: 50 } });
    const result = processAction(
      {
        type: "APPLY_WAIVER",
        agentId: "human:user-1",
        payload: {},
        policyAction: {
          type: PolicyAction.APPLY_WAIVER,
          rationale: "too short",
        },
      },
      { policy }
    );
    expect(result.result).toBe(PipelineResult.POLICY_BLOCKED);
    expect(result.reason).toContain("50");
  });

  it("logs OVERRIDE_ATTEMPTED to ledger when policy blocks", () => {
    const { policy } = compilePolicy({ waiver: { rationale_min_length: 50 } });
    const result = processAction(
      {
        type: "APPLY_WAIVER",
        agentId: "human:user-1",
        payload: {},
        policyAction: {
          type: PolicyAction.APPLY_WAIVER,
          rationale: "too short",
        },
      },
      { policy, ledger: [] }
    );
    expect(result.ledger.length).toBe(1);
    expect(result.ledger[0].type).toBe("OVERRIDE_ATTEMPTED");
    expect(result.ledger[0].payload.agent_id).toBe("human:user-1");
  });
});

describe("processBatch", () => {
  it("processes multiple actions in sequence", () => {
    // Agent advisories and heartbeats should both pass.
    const actions = [
      { sequence: 0, type: "SUBMIT_ADVISORY", agentId: "agent:a1", payload: {} },
      { sequence: 1, type: "HEARTBEAT", agentId: "agent:a2", payload: {} },
    ];
    const { results } = processBatch(actions);
    expect(results).toHaveLength(2);
    expect(results[0].result).toBe(PipelineResult.OK);
    expect(results[1].result).toBe(PipelineResult.OK);
  });

  it("accumulates ledger across batch when policy blocks", () => {
    // Human actors with insufficient rationale — capability passes, policy blocks.
    const { policy } = compilePolicy({ waiver: { rationale_min_length: 50 } });
    const actions = [
      {
        sequence: 0,
        type: "APPLY_WAIVER",
        agentId: "human:user-1",
        payload: {},
        policyAction: { type: PolicyAction.APPLY_WAIVER, rationale: "no" },
      },
      {
        sequence: 1,
        type: "APPLY_WAIVER",
        agentId: "human:user-2",
        payload: {},
        policyAction: { type: PolicyAction.APPLY_WAIVER, rationale: "also no" },
      },
    ];
    const { results, ledger } = processBatch(actions, { policy, ledger: [] });
    expect(results[0].result).toBe(PipelineResult.POLICY_BLOCKED);
    expect(results[1].result).toBe(PipelineResult.POLICY_BLOCKED);
    expect(ledger.length).toBe(2);
    expect(ledger[0].type).toBe("OVERRIDE_ATTEMPTED");
    expect(ledger[1].type).toBe("OVERRIDE_ATTEMPTED");
  });
});
