#!/usr/bin/env node
/**
 * Thingstead DLC Verifier
 * Verifies the ECDSA P-256 signature embedded in a signed DLC bundle.
 *
 * Usage:
 *   node openclaws/dlc-verifier.mjs <signed.json>
 */

import { createVerify } from "node:crypto";
import { readFileSync } from "node:fs";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import stableStringify for canonical encoding — must match sign-dlc.mjs exactly.
const { stableStringify } = await import(resolve(__dirname, "../src/utils/canonicalJson.js"));

const [, , inputPath] = process.argv;
if (!inputPath) {
  console.error("Usage: node openclaws/dlc-verifier.mjs <signed.json>");
  process.exit(1);
}

const bundle = JSON.parse(readFileSync(inputPath, "utf8"));
const { dlcSignature, ...payload } = bundle;

if (!dlcSignature) {
  console.error("❌ No dlcSignature field found. Not a signed DLC bundle.");
  process.exit(1);
}

const { algorithm, publicKeyPem, signatureHex, signedAt } = dlcSignature;

if (algorithm !== "ECDSA_P256_SHA256") {
  console.error(`❌ Unknown algorithm: ${algorithm}`);
  process.exit(1);
}

// Canonical JSON of the payload (identical encoding as sign-dlc.mjs).
const canonical = stableStringify(payload);

const verifier = createVerify("SHA256");
verifier.update(canonical, "utf8");

let valid = false;
try {
  valid = verifier.verify(publicKeyPem, signatureHex, "hex");
} catch (e) {
  console.error(`❌ Verification error: ${e.message}`);
  process.exit(1);
}

const result = { valid, algorithm, signedAt };
console.log(JSON.stringify(result, null, 2));

if (!valid) {
  console.error("❌ Signature verification FAILED — bundle may have been tampered with.");
  process.exit(1);
}
console.log("✅ Signature valid.");
