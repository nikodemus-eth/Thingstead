/**
 * Thingstead Governance Kernel — Public API.
 *
 * This is the single import point for all kernel functionality.
 * The kernel has zero UI dependencies. Every exported function is pure.
 *
 * Consuming code should import from here, not from individual kernel modules.
 *
 * ## API Tiers
 *
 * **Safe public API** (top-level exports):
 * - Type constants, evaluation functions, verification functions
 * - `processAction` / `processBatch` — the ONLY mutation entrypoint
 *   (enforces capability check → policy check → ledger append)
 *
 * **Unsafe internals** (exported via `_unsafe` namespace):
 * - `appendEntry`, `createGenesisEntry` — raw ledger mutation without access/policy checks
 * - `generateGateProof`, `bindProofToPayload` — proof minting without pipeline context
 * - `stripIntegrityForCanonical` — integrity field removal (laundering risk)
 * - `resolveConstraint`, `resolveWaiverMinLength` — internal policy resolution
 * - `revisePolicy` — policy mutation without ledger logging
 *
 * The `_unsafe` namespace exists for:
 * 1. Internal kernel module use (scheduler, enforcer)
 * 2. Reducer bootstrap (genesis entry at project creation)
 * 3. Testing and standalone verification tooling
 *
 * Consuming application code should NEVER import from `_unsafe`.
 * The reducer's use of `appendEntry` for genesis logging is a known
 * bootstrap exception — it runs once at project creation.
 */

// ═══════════════════════════════════════════════════════════════════════════
// SAFE PUBLIC API — analysis, verification, pipeline execution
// ═══════════════════════════════════════════════════════════════════════════

// Type constants
export {
  PhaseState,
  DecisionStatus,
  ArtifactStatus,
  BindingStatus,
  ArtifactCategory,
  GovernanceMode,
  AttestationType,
} from "./types.js";

// Hash primitives (read-only analysis)
export {
  stableStringify,
  sha256HexFromString,
  stableHashObject,
} from "./hash.js";

// Artifact evaluation (read-only analysis)
export {
  isRequiredFieldSatisfied,
  isArtifactWaived,
  isArtifactComplete,
  computeArtifactStatus,
  countPhaseWaivers,
} from "./artifactEvaluator.js";

// Gate evaluation (read-only analysis)
export { isGateReady } from "./gateEvaluator.js";

// Phase state machine (read-only analysis)
export { computePhaseState } from "./stateMachine.js";

// Project integrity (read-only verification)
export {
  computeProjectIntegrity,
  verifyProjectIntegrity,
} from "./integrity.js";

// Policy schema (read-only)
export { DEFAULT_POLICY, validatePolicy, hashPolicy } from "./policySchema.js";
export { compilePolicy } from "./policy.js";

// Policy enforcement (read-only check)
export { enforcePolicy, PolicyAction } from "./policyEnforcer.js";

// Ledger verification (read-only analysis)
export {
  LedgerEventType,
  verifyLedgerIntegrity,
  findDuplicateSequences,
} from "./ledger.js";

// Evidence verification (read-only analysis)
export { verifyProof, verifyEvidenceBinding } from "./evidence.js";

// Queue (transport — does not execute mutations)
export {
  createQueue,
  submitAction,
  processNext,
  queueStats,
  compactQueue,
  QueueEntryStatus,
} from "./queue.js";

// ═══════════════════════════════════════════════════════════════════════════
// MUTATION GATEWAY — the ONLY safe path for governance state changes
// ═══════════════════════════════════════════════════════════════════════════

export {
  processAction,
  processBatch,
  PipelineResult,
} from "./scheduler.js";

// Capabilities and access control (read-only analysis + enforcement)
export { Capability, ActorType, getCapabilities, hasCapability, requiredCapability } from "./capabilities.js";
export { checkAccess, resolveActorType } from "./access.js";

// ═══════════════════════════════════════════════════════════════════════════
// UNSAFE INTERNALS — low-level primitives that bypass the pipeline
//
// These are exported for:
//   1. Internal kernel module use (scheduler, enforcer)
//   2. Reducer bootstrap (genesis entry at project creation)
//   3. Testing and standalone verification tooling
//
// Application code MUST NOT import from _unsafe. If you need to
// mutate governance state, use processAction/processBatch.
// ═══════════════════════════════════════════════════════════════════════════

import { appendEntry, createGenesisEntry } from "./ledger.js";
import { generateGateProof } from "./gateProof.js";
import { bindProofToPayload } from "./evidence.js";
import { stripIntegrityForCanonical } from "./integrity.js";
import { resolveConstraint, resolveWaiverMinLength, revisePolicy } from "./policy.js";

export const _unsafe = Object.freeze({
  // Ledger mutation — bypasses access check and policy enforcement
  appendEntry,
  createGenesisEntry,

  // Proof minting — can forge proofs about states never reached via pipeline
  generateGateProof,
  bindProofToPayload,

  // Integrity laundering — removes integrity fields for re-hashing
  stripIntegrityForCanonical,

  // Policy internals — constraint resolution without enforcement context
  resolveConstraint,
  resolveWaiverMinLength,
  revisePolicy,
});
