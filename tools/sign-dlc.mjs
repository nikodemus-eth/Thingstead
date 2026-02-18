#!/usr/bin/env node
/**
 * Thingstead DLC Signer
 * Signs a JSON manifest with an ephemeral ECDSA P-256 key.
 * The public key is embedded in the output so the verifier is self-contained.
 *
 * Usage:
 *   node tools/sign-dlc.mjs <input.json> [--out <output.json>]
 */

import { createSign, generateKeyPairSync } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import stableStringify from the project source for canonical encoding.
// Works when run from the project root: node tools/sign-dlc.mjs
const { stableStringify } = await import(resolve(__dirname, "../src/utils/canonicalJson.js"));

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") out.outPath = argv[++i];
    else if (!argv[i].startsWith("--")) out.inputPath = argv[i];
  }
  return out;
}

const { inputPath, outPath } = parseArgs(process.argv.slice(2));

if (!inputPath) {
  console.error("Usage: node tools/sign-dlc.mjs <input.json> [--out <output.json>]");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(inputPath, "utf8"));

// Generate an ephemeral P-256 key pair (same curve as Thingstead's existing signing).
const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" });
const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" });

// Canonical JSON of the payload (without the signature fields).
const canonical = stableStringify(raw);

const signer = createSign("SHA256");
signer.update(canonical, "utf8");
const signatureHex = signer.sign(privateKeyPem, "hex");

const signed = {
  ...raw,
  dlcSignature: {
    algorithm: "ECDSA_P256_SHA256",
    publicKeyPem,
    signatureHex,
    signedAt: new Date().toISOString(),
  },
};

const outputPath = outPath ?? inputPath.replace(/\.json$/, ".signed.json");
writeFileSync(outputPath, JSON.stringify(signed, null, 2), "utf8");

console.log(`✅ DLC signed → ${outputPath}`);
console.log(`   Algorithm : ECDSA_P256_SHA256`);
console.log(`   Signed at : ${signed.dlcSignature.signedAt}`);
console.log(`   Signature : ${signatureHex.slice(0, 32)}…`);
