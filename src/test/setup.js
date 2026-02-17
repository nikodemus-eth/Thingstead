import "@testing-library/jest-dom/vitest";
import { vi, beforeEach } from "vitest";

const hasDom = typeof window !== "undefined" && typeof document !== "undefined";

// Deterministic, collision-free UUIDs for tests.
// JSDOM/WebCrypto implementations (and some Node versions) can behave inconsistently under test runners.
let uuidCounter = 0;
if (hasDom) {
  if (!globalThis.crypto) {
    Object.defineProperty(globalThis, "crypto", {
      value: {},
      configurable: true,
    });
  }
  globalThis.crypto.randomUUID = () => {
    uuidCounter += 1;
    // UUID-ish shape for any code that expects hyphens; uniqueness is what matters in tests.
    return `00000000-0000-4000-8000-${String(uuidCounter).padStart(12, "0")}`;
  };
}

// JSDOM does not implement this; make it a no-op for tests.
if (hasDom && typeof Element !== "undefined" && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}

// Basic localStorage safety (jsdom provides it, but we enforce clean state)
beforeEach(() => {
  if (hasDom && globalThis.localStorage?.clear) globalThis.localStorage.clear();
});

// Prevent JSDOM "Not implemented: window.open" warnings in tests.
globalThis.open = vi.fn(() => null);
if (hasDom) {
  window.open = vi.fn(() => null);
}

// Mock dialogs used by ProjectList
if (hasDom) {
  globalThis.prompt = vi.fn();
  globalThis.confirm = vi.fn(() => true);
}
