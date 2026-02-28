/**
 * Thingstead Governance Kernel — Evidence binding and verification.
 *
 * Links gate proofs and other governance evidence to ledger entries.
 * Evidence is bound by embedding the proof hash in the ledger entry payload,
 * creating a cryptographic linkage between the decision and its proof.
 *
 * Verification: given a ledger entry and a proof, confirm:
 * 1. The proof hash matches the hash stored in the ledger entry
 * 2. The proof hash matches the recomputed hash of the proof data
 */

import { sha256HexFromString, stableStringify } from "./hash.js";

/**
 * Binds a gate proof to a ledger entry payload.
 * Returns the payload with the proof hash embedded.
 *
 * @param {Object} basePayload - The original ledger event payload.
 * @param {Object} proof - The gate proof object (from generateGateProof).
 * @returns {Object} Payload with proof_hash field added.
 */
export function bindProofToPayload(basePayload, proof) {
  return {
    ...basePayload,
    proof_hash: proof.proofHash,
  };
}

/**
 * Verifies that a proof matches its claimed hash.
 *
 * @param {Object} proof - The proof object (must contain proofHash field).
 * @returns {{ valid: boolean, error: string|null }}
 */
export function verifyProof(proof) {
  if (!proof || typeof proof !== "object") {
    return { valid: false, error: "Proof is not an object." };
  }

  if (!proof.proofHash) {
    return { valid: false, error: "Proof is missing proofHash field." };
  }

  // Recompute the hash from the proof data (excluding the hash itself).
  const { proofHash, ...proofData } = proof;
  const recomputed = sha256HexFromString(stableStringify(proofData));

  if (recomputed !== proofHash) {
    return {
      valid: false,
      error: `Proof hash mismatch: stored ${proofHash.slice(0, 16)}..., computed ${recomputed.slice(0, 16)}...`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Verifies that a ledger entry's proof_hash matches the given proof.
 *
 * @param {Object} ledgerEntry - A ledger entry with payload.proof_hash.
 * @param {Object} proof - The proof to verify against.
 * @returns {{ valid: boolean, error: string|null }}
 */
export function verifyEvidenceBinding(ledgerEntry, proof) {
  if (!ledgerEntry?.payload?.proof_hash) {
    return { valid: false, error: "Ledger entry has no proof_hash in payload." };
  }

  if (!proof?.proofHash) {
    return { valid: false, error: "Proof is missing proofHash." };
  }

  if (ledgerEntry.payload.proof_hash !== proof.proofHash) {
    return {
      valid: false,
      error: "Proof hash does not match ledger entry's proof_hash.",
    };
  }

  // Also verify the proof itself is self-consistent.
  return verifyProof(proof);
}
