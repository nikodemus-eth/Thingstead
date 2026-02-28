/**
 * Thingstead Governance Kernel — Append-only hash-chained ledger.
 *
 * Every governance event is recorded as a ledger entry with:
 * - Monotonic sequence number (gapless)
 * - Link to previous entry via prev_hash
 * - Self-hash computed from all fields except hash itself
 * - Optional ECDSA signature (added by the utils layer)
 *
 * The ledger is the single source of truth for governance lineage.
 * It can be verified end-to-end: walk the chain, check every hash.
 */

import { stableStringify, sha256HexFromString } from "./hash.js";

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export const LedgerEventType = Object.freeze({
  // Project lifecycle
  PROJECT_CREATED: "PROJECT_CREATED",
  PROJECT_IMPORTED: "PROJECT_IMPORTED",

  // Gate decisions
  GATE_DECIDED: "GATE_DECIDED",

  // Artifact events
  ARTIFACT_COMPLETED: "ARTIFACT_COMPLETED",
  PHASE_UNLOCKED: "PHASE_UNLOCKED",

  // Waiver events
  WAIVER_APPLIED: "WAIVER_APPLIED",
  WAIVER_REMOVED: "WAIVER_REMOVED",

  // Policy events
  POLICY_CHANGED: "POLICY_CHANGED",

  // Security events
  OVERRIDE_ATTEMPTED: "OVERRIDE_ATTEMPTED",
});

// ---------------------------------------------------------------------------
// Genesis hash (the "zero" hash for the first entry's prev_hash)
// ---------------------------------------------------------------------------

const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

// ---------------------------------------------------------------------------
// Entry hash computation
// ---------------------------------------------------------------------------

function computeEntryHash(entry) {
  // Hash everything except the hash and signature fields.
  const hashable = {
    sequence: entry.sequence,
    type: entry.type,
    payload: entry.payload,
    timestamp: entry.timestamp,
    actor_id: entry.actor_id,
    prev_hash: entry.prev_hash,
  };
  return sha256HexFromString(stableStringify(hashable));
}

// ---------------------------------------------------------------------------
// Ledger operations (all pure — operate on arrays, return new arrays)
// ---------------------------------------------------------------------------

/**
 * Creates the first ledger entry for a new project.
 *
 * @param {string} type - Event type (e.g., LedgerEventType.PROJECT_CREATED).
 * @param {Object} payload - Event-specific data.
 * @param {string} actorId - The actor creating this entry.
 * @param {string} [timestamp] - ISO8601 timestamp (defaults to now).
 * @returns {Object} The genesis ledger entry.
 */
export function createGenesisEntry(type, payload, actorId, timestamp) {
  const entry = {
    sequence: 0,
    type,
    payload: payload || {},
    timestamp: timestamp || new Date().toISOString(),
    actor_id: actorId || "unknown",
    prev_hash: GENESIS_HASH,
  };
  entry.hash = computeEntryHash(entry);
  return entry;
}

/**
 * Appends a new entry to the ledger.
 *
 * @param {Array} ledger - The existing ledger (array of entries).
 * @param {string} type - Event type.
 * @param {Object} payload - Event-specific data.
 * @param {string} actorId - The actor creating this entry.
 * @param {string} [timestamp] - ISO8601 timestamp (defaults to now).
 * @returns {{ ledger: Array, entry: Object }} New ledger array and the appended entry.
 * @throws {Error} If sequence or timestamp invariants are violated.
 */
export function appendEntry(ledger, type, payload, actorId, timestamp) {
  const entries = ledger || [];
  const ts = timestamp || new Date().toISOString();

  if (entries.length === 0) {
    const entry = createGenesisEntry(type, payload, actorId, ts);
    return { ledger: [entry], entry };
  }

  const prev = entries[entries.length - 1];
  const nextSequence = prev.sequence + 1;

  // Invariant: timestamp must not precede the previous entry.
  if (ts < prev.timestamp) {
    throw new Error(
      `Ledger timestamp violation: new entry (${ts}) precedes previous entry (${prev.timestamp}).`
    );
  }

  const entry = {
    sequence: nextSequence,
    type,
    payload: payload || {},
    timestamp: ts,
    actor_id: actorId || "unknown",
    prev_hash: prev.hash,
  };
  entry.hash = computeEntryHash(entry);

  return { ledger: entries.concat(entry), entry };
}

// ---------------------------------------------------------------------------
// Ledger verification
// ---------------------------------------------------------------------------

/**
 * Verifies the integrity of an entire ledger chain.
 *
 * Checks:
 * 1. Sequence numbers are monotonic and gapless (0, 1, 2, ...).
 * 2. Each entry's hash matches its computed hash.
 * 3. Each entry's prev_hash matches the previous entry's hash.
 * 4. First entry's prev_hash is the genesis hash.
 * 5. Timestamps are non-decreasing.
 *
 * @param {Array} ledger - The ledger to verify.
 * @returns {{ valid: boolean, entries: number, brokenAt: number|null, error: string|null }}
 */
export function verifyLedgerIntegrity(ledger) {
  const entries = ledger || [];

  if (entries.length === 0) {
    return { valid: true, entries: 0, brokenAt: null, error: null };
  }

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];

    // Check sequence.
    if (entry.sequence !== i) {
      return {
        valid: false,
        entries: entries.length,
        brokenAt: i,
        error: `Sequence gap: expected ${i}, got ${entry.sequence}.`,
      };
    }

    // Check prev_hash link.
    if (i === 0) {
      if (entry.prev_hash !== GENESIS_HASH) {
        return {
          valid: false,
          entries: entries.length,
          brokenAt: 0,
          error: `Genesis entry has non-zero prev_hash: ${entry.prev_hash}.`,
        };
      }
    } else {
      if (entry.prev_hash !== entries[i - 1].hash) {
        return {
          valid: false,
          entries: entries.length,
          brokenAt: i,
          error: `Chain broken at sequence ${i}: prev_hash does not match previous entry's hash.`,
        };
      }
    }

    // Check self-hash.
    const recomputed = computeEntryHash(entry);
    if (entry.hash !== recomputed) {
      return {
        valid: false,
        entries: entries.length,
        brokenAt: i,
        error: `Hash mismatch at sequence ${i}: stored ${entry.hash}, computed ${recomputed}.`,
      };
    }

    // Check timestamp ordering.
    if (i > 0 && entry.timestamp < entries[i - 1].timestamp) {
      return {
        valid: false,
        entries: entries.length,
        brokenAt: i,
        error: `Timestamp regression at sequence ${i}: ${entry.timestamp} < ${entries[i - 1].timestamp}.`,
      };
    }
  }

  return { valid: true, entries: entries.length, brokenAt: null, error: null };
}

/**
 * Checks for duplicate sequence numbers in a ledger.
 *
 * @param {Array} ledger - The ledger to check.
 * @returns {number[]} Array of duplicate sequence numbers (empty if none).
 */
export function findDuplicateSequences(ledger) {
  const seen = new Set();
  const duplicates = [];
  for (const entry of ledger || []) {
    if (seen.has(entry.sequence)) {
      duplicates.push(entry.sequence);
    }
    seen.add(entry.sequence);
  }
  return duplicates;
}
