/**
 * Thingstead Governance Kernel — Public API.
 *
 * This is the single import point for all kernel functionality.
 * The kernel has zero UI dependencies. Every exported function is pure.
 *
 * Consuming code should import from here, not from individual kernel modules.
 */

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

// Hash primitives
export {
  stableStringify,
  sha256HexFromString,
  stableHashObject,
} from "./hash.js";

// Artifact evaluation
export {
  isRequiredFieldSatisfied,
  isArtifactWaived,
  isArtifactComplete,
  computeArtifactStatus,
  countPhaseWaivers,
} from "./artifactEvaluator.js";

// Gate evaluation
export { isGateReady } from "./gateEvaluator.js";

// Phase state machine
export { computePhaseState } from "./stateMachine.js";

// Project integrity
export {
  computeProjectIntegrity,
  verifyProjectIntegrity,
  stripIntegrityForCanonical,
} from "./integrity.js";

// Policy schema and compilation
export { DEFAULT_POLICY, validatePolicy, hashPolicy } from "./policySchema.js";
export { compilePolicy, resolveConstraint, resolveWaiverMinLength, revisePolicy } from "./policy.js";

// Policy enforcement
export { enforcePolicy, PolicyAction } from "./policyEnforcer.js";

// Ledger
export {
  LedgerEventType,
  createGenesisEntry,
  appendEntry,
  verifyLedgerIntegrity,
  findDuplicateSequences,
} from "./ledger.js";

// Action queue
export {
  createQueue,
  submitAction,
  processNext,
  queueStats,
  compactQueue,
  QueueEntryStatus,
} from "./queue.js";

// Scheduler
export {
  processAction,
  processBatch,
  PipelineResult,
} from "./scheduler.js";

// Gate proofs and evidence
export { generateGateProof } from "./gateProof.js";
export { bindProofToPayload, verifyProof, verifyEvidenceBinding } from "./evidence.js";

// Capabilities and access control
export { Capability, ActorType, getCapabilities, hasCapability, requiredCapability } from "./capabilities.js";
export { checkAccess, resolveActorType } from "./access.js";
