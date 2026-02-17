function hex(byte) {
  return byte.toString(16).padStart(2, "0");
}

function uuidFromBytes(bytes) {
  // RFC4122 v4 layout.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const b = Array.from(bytes, hex);
  return (
    b.slice(0, 4).join("") +
    "-" +
    b.slice(4, 6).join("") +
    "-" +
    b.slice(6, 8).join("") +
    "-" +
    b.slice(8, 10).join("") +
    "-" +
    b.slice(10, 16).join("")
  );
}

// Use Web Crypto if available; fall back to Math.random as a last resort.
export function randomUUID() {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();

  if (c && typeof c.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    c.getRandomValues(bytes);
    return uuidFromBytes(bytes);
  }

  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return uuidFromBytes(bytes);
}

