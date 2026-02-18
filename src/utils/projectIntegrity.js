import { stableStringify } from "./canonicalJson.js";
import { sha256HexFromString } from "./templateHash.js";

const SIGNING_KEYPAIR_STORAGE_KEY = "cpmai-signing-keypair-v1";

function toBase64Url(bytes) {
  let str = "";
  for (let i = 0; i < bytes.length; i += 1) str += String.fromCharCode(bytes[i]);
  return btoa(str).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function fromArrayBuffer(buf) {
  return new Uint8Array(buf);
}

function stripIntegrityForCanonical(project) {
  if (!project || typeof project !== "object") return project;
  // Deep-copy while dropping integrity/signature fields.
  const cloned = JSON.parse(stableStringify(project));
  delete cloned.integrity;
  return cloned;
}

export function computeProjectIntegrity(project) {
  const canonicalObj = stripIntegrityForCanonical(project);
  const canonical = stableStringify(canonicalObj);
  const hash = sha256HexFromString(canonical);
  return {
    algorithm: "sha256",
    canonical_version: "1",
    hash,
    computed_at: new Date().toISOString(),
  };
}

async function getOrCreateSigningKeyPair() {
  if (typeof crypto === "undefined" || !crypto.subtle) return null;
  try {
    const raw = localStorage.getItem(SIGNING_KEYPAIR_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.v === 1 && parsed.privateJwk && parsed.publicJwk) {
        const privateKey = await crypto.subtle.importKey(
          "jwk",
          parsed.privateJwk,
          { name: "ECDSA", namedCurve: "P-256" },
          false,
          ["sign"]
        );
        const publicKey = await crypto.subtle.importKey(
          "jwk",
          parsed.publicJwk,
          { name: "ECDSA", namedCurve: "P-256" },
          true,
          ["verify"]
        );
        return { privateKey, publicKey, publicJwk: parsed.publicJwk };
      }
    }
  } catch {
    // ignore and regenerate
  }

  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  try {
    localStorage.setItem(
      SIGNING_KEYPAIR_STORAGE_KEY,
      JSON.stringify({ v: 1, created_at: new Date().toISOString(), privateJwk, publicJwk })
    );
  } catch {
    // non-fatal; signing will still work for this session
  }
  return { privateKey: keyPair.privateKey, publicKey: keyPair.publicKey, publicJwk };
}

export function verifyProjectIntegrity(project) {
  const errors = [];
  const warnings = [];

  if (!project || typeof project !== "object") {
    return { ok: false, errors: ["Project is not an object."], warnings };
  }

  // 1. Hash verification
  if (project.integrity?.hash) {
    const recomputed = computeProjectIntegrity(project);
    if (recomputed.hash !== project.integrity.hash) {
      errors.push(`Integrity hash mismatch: expected ${project.integrity.hash}, got ${recomputed.hash}. Project may have been modified outside Thingstead.`);
    }
  } else {
    warnings.push("No integrity hash found. Cannot verify project authenticity.");
  }

  // 2. Phase ID uniqueness
  const phaseIds = new Set();
  for (const phase of project.phases || []) {
    if (phaseIds.has(phase.id)) {
      errors.push(`Duplicate phase ID: ${phase.id}`);
    }
    phaseIds.add(phase.id);
  }

  // 3. Artifact ID uniqueness across project
  const artifactIds = new Set();
  for (const phase of project.phases || []) {
    for (const artifact of phase.artifacts || []) {
      if (artifactIds.has(artifact.id)) {
        errors.push(`Duplicate artifact ID across phases: ${artifact.id}`);
      }
      artifactIds.add(artifact.id);
    }
  }

  // 4. Gate decision validity
  for (const phase of project.phases || []) {
    const decision = phase.goNoGoDecision;
    if (decision && (decision.status === "go" || decision.status === "no-go")) {
      if (!decision.decidedAt) {
        errors.push(`Phase ${phase.id} has ${decision.status} decision without decidedAt timestamp.`);
      }
    }
  }

  // 5. Waiver rationale length
  for (const phase of project.phases || []) {
    for (const artifact of phase.artifacts || []) {
      if (artifact.waiver?.waived && typeof artifact.waiver.rationale === "string") {
        if (artifact.waiver.rationale.replace(/\s+/g, "").length < 20) {
          warnings.push(`Artifact "${artifact.name || artifact.id}" has a short waiver rationale (< 20 non-whitespace chars).`);
        }
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}

export async function signProject(project) {
  const kp = await getOrCreateSigningKeyPair();
  if (!kp) return null;

  const canonicalObj = stripIntegrityForCanonical(project);
  const canonical = stableStringify(canonicalObj);
  const data = new TextEncoder().encode(canonical);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, kp.privateKey, data);
  const signature_b64url = toBase64Url(fromArrayBuffer(sig));

  return {
    algorithm: "ECDSA_P256_SHA256",
    public_key_jwk: kp.publicJwk,
    signature_b64url,
    signed_at: new Date().toISOString(),
  };
}

