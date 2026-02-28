/**
 * Project integrity utilities — delegates pure logic to the governance kernel.
 *
 * This module adds browser-specific signing (ECDSA via Web Crypto)
 * on top of the kernel's pure hash computation and verification.
 */

import { stableStringify } from "../kernel/hash.js";
import {
  computeProjectIntegrity,
  verifyProjectIntegrity,
  stripIntegrityForCanonical,
} from "../kernel/integrity.js";

// Re-export kernel functions unchanged.
export { computeProjectIntegrity, verifyProjectIntegrity };

// ---------------------------------------------------------------------------
// Browser-specific signing (ECDSA P-256 via Web Crypto)
// ---------------------------------------------------------------------------

const SIGNING_KEYPAIR_STORAGE_KEY = "cpmai-signing-keypair-v1";

function toBase64Url(bytes) {
  let str = "";
  for (let i = 0; i < bytes.length; i += 1) str += String.fromCharCode(bytes[i]);
  return btoa(str).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/g, "");
}

function fromArrayBuffer(buf) {
  return new Uint8Array(buf);
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
