#!/usr/bin/env node
/**
 * Thingstead Sovereignty Verifier — Standalone
 *
 * Verifies a Thingstead export bundle without any Thingstead runtime dependency.
 * Uses only Node.js built-in crypto for hash verification.
 *
 * Usage:
 *   node tools/verify.mjs <path-to-export.json>
 *   node tools/verify.mjs --stdin < export.json
 *
 * Exit codes:
 *   0 — All checks pass
 *   1 — Verification failed
 *   2 — Usage error
 */

import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Stable JSON serialization (matches kernel/hash.js stableStringify)
// ---------------------------------------------------------------------------

function stableStringify(obj) {
  if (obj === null || obj === undefined) return JSON.stringify(obj);
  if (typeof obj !== "object") return JSON.stringify(obj);
  if (Array.isArray(obj)) {
    return "[" + obj.map((item) => stableStringify(item)).join(",") + "]";
  }
  const keys = Object.keys(obj).sort();
  const parts = keys.map((key) => JSON.stringify(key) + ":" + stableStringify(obj[key]));
  return "{" + parts.join(",") + "}";
}

function sha256Hex(str) {
  return createHash("sha256").update(str, "utf-8").digest("hex");
}

// ---------------------------------------------------------------------------
// Ledger verification (matches kernel/ledger.js verifyLedgerIntegrity)
// ---------------------------------------------------------------------------

const GENESIS_HASH = "0000000000000000000000000000000000000000000000000000000000000000";

function computeEntryHash(entry) {
  const hashable = {
    sequence: entry.sequence,
    type: entry.type,
    payload: entry.payload,
    timestamp: entry.timestamp,
    actor_id: entry.actor_id,
    prev_hash: entry.prev_hash,
  };
  return sha256Hex(stableStringify(hashable));
}

function verifyLedger(ledger) {
  const results = [];
  if (!Array.isArray(ledger) || ledger.length === 0) {
    return { valid: true, entries: 0, results };
  }

  let valid = true;
  for (let i = 0; i < ledger.length; i++) {
    const entry = ledger[i];
    const checks = [];

    // Sequence check
    if (entry.sequence !== i) {
      checks.push(`FAIL: expected sequence ${i}, got ${entry.sequence}`);
      valid = false;
    } else {
      checks.push(`OK: sequence ${i}`);
    }

    // prev_hash link
    if (i === 0) {
      if (entry.prev_hash !== GENESIS_HASH) {
        checks.push(`FAIL: genesis prev_hash is not zero hash`);
        valid = false;
      } else {
        checks.push(`OK: genesis prev_hash`);
      }
    } else {
      if (entry.prev_hash !== ledger[i - 1].hash) {
        checks.push(`FAIL: prev_hash does not match previous entry's hash`);
        valid = false;
      } else {
        checks.push(`OK: prev_hash chain`);
      }
    }

    // Self-hash
    const recomputed = computeEntryHash(entry);
    if (entry.hash !== recomputed) {
      checks.push(`FAIL: hash mismatch (stored: ${entry.hash.slice(0, 16)}..., computed: ${recomputed.slice(0, 16)}...)`);
      valid = false;
    } else {
      checks.push(`OK: self-hash`);
    }

    // Timestamp ordering
    if (i > 0 && entry.timestamp < ledger[i - 1].timestamp) {
      checks.push(`FAIL: timestamp regression`);
      valid = false;
    } else {
      checks.push(`OK: timestamp`);
    }

    results.push({ sequence: i, type: entry.type, checks });
  }

  return { valid, entries: ledger.length, results };
}

// ---------------------------------------------------------------------------
// Verification block checks
// ---------------------------------------------------------------------------

function verifyVerificationBlock(bundle) {
  const results = [];
  const verification = bundle.verification;
  if (!verification) {
    results.push("SKIP: No verification block in bundle");
    return { valid: true, results };
  }

  let valid = true;
  const project = bundle.project;

  // Ledger hash
  if (verification.ledger) {
    const ledger = project.ledger || [];
    if (verification.ledger.hash && ledger.length > 0) {
      const computed = sha256Hex(stableStringify(ledger));
      if (computed !== verification.ledger.hash) {
        results.push(`FAIL: Ledger hash mismatch (bundle: ${verification.ledger.hash.slice(0, 16)}..., computed: ${computed.slice(0, 16)}...)`);
        valid = false;
      } else {
        results.push(`OK: Ledger hash matches (${ledger.length} entries)`);
      }
    }
  }

  // Policy hash
  if (verification.policy) {
    const policy = project.policy;
    if (verification.policy.hash && policy) {
      const computed = sha256Hex(stableStringify(policy));
      if (computed !== verification.policy.hash) {
        results.push(`FAIL: Policy hash mismatch`);
        valid = false;
      } else {
        results.push(`OK: Policy hash matches (v${policy.version})`);
      }
    }
  }

  // Audit log hash
  if (verification.audit_log) {
    const auditLog = project.audit_log || [];
    if (verification.audit_log.hash && auditLog.length > 0) {
      const computed = sha256Hex(stableStringify(auditLog));
      if (computed !== verification.audit_log.hash) {
        results.push(`FAIL: Audit log hash mismatch`);
        valid = false;
      } else {
        results.push(`OK: Audit log hash matches (${auditLog.length} entries)`);
      }
    }
  }

  return { valid, results };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function verify(bundle) {
  const output = { sections: [], overall: true };

  // 1. Bundle structure
  const section1 = { name: "Bundle Structure", checks: [] };
  if (!bundle || typeof bundle !== "object") {
    section1.checks.push("FAIL: Not a valid JSON object");
    output.overall = false;
  } else {
    section1.checks.push(`OK: schemaVersion ${bundle.schemaVersion}`);
    if (bundle.sovereignty) {
      section1.checks.push(`OK: Sovereignty block present (${bundle.sovereignty.format})`);
    }
    if (bundle.verification) {
      section1.checks.push(`OK: Verification block present`);
    }
    if (bundle.project) {
      section1.checks.push(`OK: Project present (${bundle.project.name || bundle.project.id || "unnamed"})`);
    } else {
      section1.checks.push("FAIL: No project in bundle");
      output.overall = false;
    }
  }
  output.sections.push(section1);

  if (!bundle?.project) return output;

  // 2. Ledger integrity
  const section2 = { name: "Ledger Integrity", checks: [] };
  const ledger = bundle.project.ledger || [];
  if (ledger.length === 0) {
    section2.checks.push("SKIP: No ledger entries");
  } else {
    const ledgerResult = verifyLedger(ledger);
    if (ledgerResult.valid) {
      section2.checks.push(`OK: ${ledgerResult.entries} entries, chain intact`);
    } else {
      output.overall = false;
      for (const r of ledgerResult.results) {
        const failures = r.checks.filter((c) => c.startsWith("FAIL"));
        for (const f of failures) {
          section2.checks.push(`${f} (entry ${r.sequence}: ${r.type})`);
        }
      }
    }
  }
  output.sections.push(section2);

  // 3. Verification block
  const section3 = { name: "Verification Block", checks: [] };
  const vResult = verifyVerificationBlock(bundle);
  section3.checks.push(...vResult.results);
  if (!vResult.valid) output.overall = false;
  output.sections.push(section3);

  // 4. Policy
  const section4 = { name: "Policy", checks: [] };
  const policy = bundle.project.policy;
  if (!policy) {
    section4.checks.push("SKIP: No policy object");
  } else {
    section4.checks.push(`OK: Policy v${policy.version} (${policy.name || "unnamed"})`);
    if (policy.waiver) {
      section4.checks.push(`  Waiver min: ${policy.waiver.rationale_min_length} chars`);
    }
    if (policy.gate) {
      section4.checks.push(`  Solo attestation min: ${policy.gate.solo_attestation_min_length} chars`);
      section4.checks.push(`  No-go continue: ${policy.gate.allow_no_go_continue}`);
    }
  }
  output.sections.push(section4);

  // 5. Governance summary
  const section5 = { name: "Governance Summary", checks: [] };
  const project = bundle.project;
  section5.checks.push(`Mode: ${project.governance_mode || "unknown"}`);
  section5.checks.push(`Plan: ${project.plan?.id || project.plan_id || "unknown"}`);
  section5.checks.push(`Owner: ${project.project_owner || "unknown"}`);
  section5.checks.push(`Phases: ${(project.phases || []).length}`);
  const totalArtifacts = (project.phases || []).reduce((sum, p) => sum + (p.artifacts || []).length, 0);
  section5.checks.push(`Total artifacts: ${totalArtifacts}`);
  output.sections.push(section5);

  return output;
}

function printResults(output) {
  console.log("\n=== Thingstead Sovereignty Verification ===\n");
  for (const section of output.sections) {
    console.log(`[${section.name}]`);
    for (const check of section.checks) {
      console.log(`  ${check}`);
    }
    console.log();
  }
  console.log(output.overall ? "RESULT: ALL CHECKS PASSED" : "RESULT: VERIFICATION FAILED");
  console.log();
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: node tools/verify.mjs <path-to-export.json>");
  console.error("       node tools/verify.mjs --stdin < export.json");
  process.exit(2);
}

let jsonString;
if (args[0] === "--stdin") {
  jsonString = readFileSync(0, "utf-8");
} else {
  jsonString = readFileSync(args[0], "utf-8");
}

let bundle;
try {
  bundle = JSON.parse(jsonString);
} catch {
  console.error("ERROR: Failed to parse JSON");
  process.exit(1);
}

const output = verify(bundle);
printResults(output);
process.exit(output.overall ? 0 : 1);
