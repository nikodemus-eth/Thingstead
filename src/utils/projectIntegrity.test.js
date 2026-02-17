import { describe, expect, it, vi } from "vitest";
import { computeProjectIntegrity, signProject } from "./projectIntegrity.js";
import { stableStringify } from "./canonicalJson.js";

function base64UrlToBytes(b64url) {
  const b64 = String(b64url).replaceAll("-", "+").replaceAll("_", "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) out[i] = binary.charCodeAt(i);
  return out;
}

describe("projectIntegrity", () => {
  it("computeProjectIntegrity is deterministic and ignores existing integrity field", () => {
    const project = {
      id: "p1",
      name: "Test",
      phases: [{ id: 1, artifacts: [{ name: "A", notes: "n" }] }],
      integrity: { algorithm: "sha256", canonical_version: "1", hash: "nope" },
    };

    const a = computeProjectIntegrity(project);
    const b = computeProjectIntegrity({ ...project, integrity: { hash: "different" } });

    expect(a.algorithm).toBe("sha256");
    expect(a.canonical_version).toBe("1");
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(typeof a.computed_at).toBe("string");
    expect(a.hash).toBe(b.hash);
  });

  it("signProject feature-detects crypto.subtle", async () => {
    const hasSubtle = Boolean(globalThis.crypto && globalThis.crypto.subtle);
    const sig = await signProject({ id: "p1" });
    if (hasSubtle) expect(sig).not.toBeNull();
    else expect(sig).toBeNull();
  });

  it("signProject produces a verifiable signature over canonical project without integrity", async () => {
    if (!globalThis.crypto?.subtle) {
      const sig = await signProject({ id: "p1" });
      expect(sig).toBeNull();
      return;
    }

    try {
      const project = {
        id: "p1",
        name: "Signed Project",
        phases: [{ id: 1, artifacts: [{ name: "Artifact", notes: "hello" }] }],
        integrity: { algorithm: "sha256", canonical_version: "1", hash: "should-be-ignored" },
      };

      const now = new Date("2026-02-14T00:00:00.000Z");
      const spy = vi.spyOn(Date, "now").mockReturnValue(now.getTime());

      const sig = await signProject(project);
      spy.mockRestore();

      expect(sig).not.toBeNull();
      expect(sig.algorithm).toBe("ECDSA_P256_SHA256");
      expect(sig.signature_b64url).toMatch(/^[A-Za-z0-9_-]+$/);
      expect(sig.public_key_jwk).toBeTruthy();
      expect(typeof sig.signed_at).toBe("string");

      const canonicalObj = JSON.parse(stableStringify(project));
      delete canonicalObj.integrity;
      const canonical = stableStringify(canonicalObj);
      const data = new TextEncoder().encode(canonical);

      const publicKey = await globalThis.crypto.subtle.importKey(
        "jwk",
        sig.public_key_jwk,
        { name: "ECDSA", namedCurve: "P-256" },
        true,
        ["verify"]
      );

      const ok = await globalThis.crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        publicKey,
        base64UrlToBytes(sig.signature_b64url),
        data
      );
      expect(ok).toBe(true);
    } finally {
      // no cleanup needed
    }
  });
});
