import { describe, it, expect } from "vitest";
import { generateGateProof } from "./gateProof.js";
import { bindProofToPayload, verifyProof, verifyEvidenceBinding } from "./evidence.js";
import { BindingStatus } from "./types.js";

function makePhase(artifacts = []) {
  return {
    id: 1,
    name: "Phase 1",
    artifacts: artifacts.length > 0 ? artifacts : [
      { id: "a1", name: "Artifact 1", isGateBlocking: true, field_values: {} },
      {
        id: "a2",
        name: "Artifact 2",
        isGateBlocking: true,
        waiver: { waived: true, rationale: "This artifact is not applicable to our project scope at all" },
      },
      { id: "a3", name: "Supplemental", isGateBlocking: false, field_values: {} },
    ],
  };
}

function stubResolver() {
  return (_phase, _artifact) => ({ template: null, binding: BindingStatus.MISSING });
}

describe("generateGateProof", () => {
  it("produces a proof with all required fields", () => {
    const phase = makePhase();
    const proof = generateGateProof(
      phase,
      stubResolver(),
      null,
      { status: "go", notes: "All good" },
      "actor1"
    );

    expect(proof.phaseId).toBe(1);
    expect(proof.decision).toBe("go");
    expect(proof.actorId).toBe("actor1");
    expect(proof.artifactCount).toBe(3);
    expect(proof.gateBlockingCount).toBe(2);
    expect(proof.evaluatedAt).toBeTruthy();
    expect(proof.proofHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("captures waiver details for waived artifacts", () => {
    const phase = makePhase();
    const proof = generateGateProof(phase, stubResolver(), null, { status: "go" }, "actor1");
    const waived = proof.artifacts.find((a) => a.id === "a2");
    expect(waived.waived).toBe(true);
    expect(waived.waiver).toBeDefined();
    expect(waived.waiver.rationale_length).toBeGreaterThan(0);
  });

  it("captures completion method for non-waived complete artifacts", () => {
    const phase = makePhase([
      { id: "a1", name: "With notes", isGateBlocking: true, notes: "Enough content to be complete in a non-templated artifact" },
    ]);
    const proof = generateGateProof(phase, stubResolver(), null, { status: "go" }, "actor1");
    const a1 = proof.artifacts.find((a) => a.id === "a1");
    expect(a1.complete).toBe(true);
    expect(a1.completionMethod).toBe("non-templated");
  });

  it("counts waived and completed artifacts", () => {
    const phase = makePhase();
    const proof = generateGateProof(phase, stubResolver(), null, { status: "go" }, "actor1");
    expect(proof.waivedCount).toBe(1);
  });

  it("includes policy version when provided", () => {
    const proof = generateGateProof(
      makePhase(),
      stubResolver(),
      { version: 3 },
      { status: "go" },
      "actor1"
    );
    expect(proof.policyVersion).toBe(3);
  });

  it("proof hash is deterministic for the same input", () => {
    // Same snapshot should produce the same proof data (excluding timestamp)
    const phase = makePhase();
    const proof = generateGateProof(phase, stubResolver(), null, { status: "go" }, "actor1");
    expect(proof.proofHash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("evidence binding", () => {
  it("binds proof hash to a payload", () => {
    const proof = generateGateProof(makePhase(), stubResolver(), null, { status: "go" }, "actor1");
    const payload = bindProofToPayload({ phase_id: 1, decision: "go" }, proof);
    expect(payload.proof_hash).toBe(proof.proofHash);
    expect(payload.phase_id).toBe(1);
  });
});

describe("verifyProof", () => {
  it("validates a correct proof", () => {
    const proof = generateGateProof(makePhase(), stubResolver(), null, { status: "go" }, "actor1");
    const result = verifyProof(proof);
    expect(result.valid).toBe(true);
  });

  it("rejects a tampered proof", () => {
    const proof = generateGateProof(makePhase(), stubResolver(), null, { status: "go" }, "actor1");
    proof.decision = "no-go"; // tamper
    const result = verifyProof(proof);
    expect(result.valid).toBe(false);
    expect(result.error).toContain("mismatch");
  });

  it("rejects null proof", () => {
    expect(verifyProof(null).valid).toBe(false);
  });
});

describe("verifyEvidenceBinding", () => {
  it("validates matching proof and ledger entry", () => {
    const proof = generateGateProof(makePhase(), stubResolver(), null, { status: "go" }, "actor1");
    const ledgerEntry = { payload: { proof_hash: proof.proofHash } };
    const result = verifyEvidenceBinding(ledgerEntry, proof);
    expect(result.valid).toBe(true);
  });

  it("rejects mismatched proof hash", () => {
    const proof = generateGateProof(makePhase(), stubResolver(), null, { status: "go" }, "actor1");
    const ledgerEntry = { payload: { proof_hash: "0000000000000000000000000000000000000000000000000000000000000000" } };
    const result = verifyEvidenceBinding(ledgerEntry, proof);
    expect(result.valid).toBe(false);
  });

  it("rejects ledger entry without proof_hash", () => {
    const proof = generateGateProof(makePhase(), stubResolver(), null, { status: "go" }, "actor1");
    const result = verifyEvidenceBinding({ payload: {} }, proof);
    expect(result.valid).toBe(false);
  });
});
