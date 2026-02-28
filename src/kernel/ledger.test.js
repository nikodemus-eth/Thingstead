import { describe, it, expect } from "vitest";
import {
  LedgerEventType,
  createGenesisEntry,
  appendEntry,
  verifyLedgerIntegrity,
  findDuplicateSequences,
} from "./ledger.js";

const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";
const ACTOR = "device-test-001";
const TS1 = "2026-01-01T00:00:00.000Z";
const TS2 = "2026-01-01T00:01:00.000Z";
const TS3 = "2026-01-01T00:02:00.000Z";

describe("createGenesisEntry", () => {
  it("creates a valid genesis entry with sequence 0", () => {
    const entry = createGenesisEntry(LedgerEventType.PROJECT_CREATED, { name: "Test" }, ACTOR, TS1);
    expect(entry.sequence).toBe(0);
    expect(entry.type).toBe("PROJECT_CREATED");
    expect(entry.payload).toEqual({ name: "Test" });
    expect(entry.actor_id).toBe(ACTOR);
    expect(entry.prev_hash).toBe(GENESIS_HASH);
    expect(entry.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces a deterministic hash for identical inputs", () => {
    const a = createGenesisEntry(LedgerEventType.PROJECT_CREATED, { x: 1 }, ACTOR, TS1);
    const b = createGenesisEntry(LedgerEventType.PROJECT_CREATED, { x: 1 }, ACTOR, TS1);
    expect(a.hash).toBe(b.hash);
  });

  it("produces different hashes for different payloads", () => {
    const a = createGenesisEntry(LedgerEventType.PROJECT_CREATED, { x: 1 }, ACTOR, TS1);
    const b = createGenesisEntry(LedgerEventType.PROJECT_CREATED, { x: 2 }, ACTOR, TS1);
    expect(a.hash).not.toBe(b.hash);
  });
});

describe("appendEntry", () => {
  it("creates genesis when appending to empty ledger", () => {
    const { ledger, entry } = appendEntry([], LedgerEventType.PROJECT_CREATED, { name: "P" }, ACTOR, TS1);
    expect(ledger).toHaveLength(1);
    expect(entry.sequence).toBe(0);
    expect(entry.prev_hash).toBe(GENESIS_HASH);
  });

  it("appends with correct sequence and prev_hash", () => {
    const { ledger: l1 } = appendEntry([], LedgerEventType.PROJECT_CREATED, {}, ACTOR, TS1);
    const { ledger: l2, entry } = appendEntry(l1, LedgerEventType.GATE_DECIDED, { phase: 1 }, ACTOR, TS2);
    expect(l2).toHaveLength(2);
    expect(entry.sequence).toBe(1);
    expect(entry.prev_hash).toBe(l1[0].hash);
  });

  it("builds a valid chain across multiple appends", () => {
    let ledger = [];
    const result1 = appendEntry(ledger, LedgerEventType.PROJECT_CREATED, {}, ACTOR, TS1);
    ledger = result1.ledger;
    const result2 = appendEntry(ledger, LedgerEventType.WAIVER_APPLIED, { artifact: "a1" }, ACTOR, TS2);
    ledger = result2.ledger;
    const result3 = appendEntry(ledger, LedgerEventType.GATE_DECIDED, { phase: 1 }, ACTOR, TS3);
    ledger = result3.ledger;

    expect(ledger).toHaveLength(3);
    expect(ledger[0].sequence).toBe(0);
    expect(ledger[1].sequence).toBe(1);
    expect(ledger[2].sequence).toBe(2);
    expect(ledger[1].prev_hash).toBe(ledger[0].hash);
    expect(ledger[2].prev_hash).toBe(ledger[1].hash);
  });

  it("throws on timestamp regression", () => {
    const { ledger } = appendEntry([], LedgerEventType.PROJECT_CREATED, {}, ACTOR, TS2);
    expect(() => appendEntry(ledger, LedgerEventType.GATE_DECIDED, {}, ACTOR, TS1)).toThrow(
      /timestamp violation/i
    );
  });

  it("handles null ledger as empty", () => {
    const { ledger } = appendEntry(null, LedgerEventType.PROJECT_CREATED, {}, ACTOR, TS1);
    expect(ledger).toHaveLength(1);
  });
});

describe("verifyLedgerIntegrity", () => {
  it("returns valid for empty ledger", () => {
    const result = verifyLedgerIntegrity([]);
    expect(result.valid).toBe(true);
    expect(result.entries).toBe(0);
  });

  it("returns valid for a properly built chain", () => {
    let ledger = [];
    ledger = appendEntry(ledger, LedgerEventType.PROJECT_CREATED, {}, ACTOR, TS1).ledger;
    ledger = appendEntry(ledger, LedgerEventType.WAIVER_APPLIED, {}, ACTOR, TS2).ledger;
    ledger = appendEntry(ledger, LedgerEventType.GATE_DECIDED, {}, ACTOR, TS3).ledger;

    const result = verifyLedgerIntegrity(ledger);
    expect(result.valid).toBe(true);
    expect(result.entries).toBe(3);
    expect(result.brokenAt).toBeNull();
  });

  it("detects tampered hash", () => {
    let ledger = [];
    ledger = appendEntry(ledger, LedgerEventType.PROJECT_CREATED, {}, ACTOR, TS1).ledger;
    ledger = appendEntry(ledger, LedgerEventType.GATE_DECIDED, {}, ACTOR, TS2).ledger;

    // Tamper with first entry's hash.
    const tampered = ledger.map((e) => ({ ...e }));
    tampered[0].hash = "deadbeef".repeat(8);

    const result = verifyLedgerIntegrity(tampered);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(0);
    expect(result.error).toMatch(/hash mismatch/i);
  });

  it("detects broken chain link", () => {
    let ledger = [];
    ledger = appendEntry(ledger, LedgerEventType.PROJECT_CREATED, {}, ACTOR, TS1).ledger;
    ledger = appendEntry(ledger, LedgerEventType.GATE_DECIDED, {}, ACTOR, TS2).ledger;

    // Tamper with second entry's prev_hash.
    const tampered = ledger.map((e) => ({ ...e }));
    tampered[1].prev_hash = "aaaa".repeat(16);

    const result = verifyLedgerIntegrity(tampered);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(1);
    expect(result.error).toMatch(/chain broken/i);
  });

  it("detects sequence gap", () => {
    const ledger = [
      createGenesisEntry(LedgerEventType.PROJECT_CREATED, {}, ACTOR, TS1),
    ];
    // Manually create entry with wrong sequence.
    const bad = { ...ledger[0], sequence: 5 };
    bad.hash = "x".repeat(64);

    const result = verifyLedgerIntegrity([bad]);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(0);
    expect(result.error).toMatch(/sequence gap/i);
  });

  it("detects invalid genesis prev_hash", () => {
    const entry = createGenesisEntry(LedgerEventType.PROJECT_CREATED, {}, ACTOR, TS1);
    entry.prev_hash = "not-genesis";
    // Recompute hash since we changed prev_hash.
    // (The entry hash will still fail because prev_hash changed.)
    const result = verifyLedgerIntegrity([entry]);
    expect(result.valid).toBe(false);
    expect(result.brokenAt).toBe(0);
  });

  it("detects tampered payload (hash mismatch)", () => {
    let ledger = [];
    ledger = appendEntry(ledger, LedgerEventType.PROJECT_CREATED, { name: "Original" }, ACTOR, TS1).ledger;

    const tampered = [{ ...ledger[0], payload: { name: "Tampered" } }];
    const result = verifyLedgerIntegrity(tampered);
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/hash mismatch/i);
  });

  it("handles null ledger", () => {
    const result = verifyLedgerIntegrity(null);
    expect(result.valid).toBe(true);
    expect(result.entries).toBe(0);
  });
});

describe("findDuplicateSequences", () => {
  it("returns empty for valid ledger", () => {
    let ledger = [];
    ledger = appendEntry(ledger, LedgerEventType.PROJECT_CREATED, {}, ACTOR, TS1).ledger;
    ledger = appendEntry(ledger, LedgerEventType.GATE_DECIDED, {}, ACTOR, TS2).ledger;
    expect(findDuplicateSequences(ledger)).toEqual([]);
  });

  it("detects duplicate sequence numbers", () => {
    const entry = createGenesisEntry(LedgerEventType.PROJECT_CREATED, {}, ACTOR, TS1);
    const dupe = { ...entry, hash: "different" };
    expect(findDuplicateSequences([entry, dupe])).toEqual([0]);
  });

  it("handles null ledger", () => {
    expect(findDuplicateSequences(null)).toEqual([]);
  });
});

describe("LedgerEventType", () => {
  it("contains all expected event types", () => {
    expect(LedgerEventType.PROJECT_CREATED).toBe("PROJECT_CREATED");
    expect(LedgerEventType.GATE_DECIDED).toBe("GATE_DECIDED");
    expect(LedgerEventType.WAIVER_APPLIED).toBe("WAIVER_APPLIED");
    expect(LedgerEventType.WAIVER_REMOVED).toBe("WAIVER_REMOVED");
    expect(LedgerEventType.ARTIFACT_COMPLETED).toBe("ARTIFACT_COMPLETED");
    expect(LedgerEventType.PHASE_UNLOCKED).toBe("PHASE_UNLOCKED");
    expect(LedgerEventType.POLICY_CHANGED).toBe("POLICY_CHANGED");
    expect(LedgerEventType.OVERRIDE_ATTEMPTED).toBe("OVERRIDE_ATTEMPTED");
    expect(LedgerEventType.PROJECT_IMPORTED).toBe("PROJECT_IMPORTED");
  });

  it("is frozen (immutable)", () => {
    expect(Object.isFrozen(LedgerEventType)).toBe(true);
  });
});
