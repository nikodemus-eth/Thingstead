import { describe, it, expect } from "vitest";
import { useFocusTrap } from "./useFocusTrap.js";

describe("useFocusTrap", () => {
  it("exports a function", () => {
    expect(typeof useFocusTrap).toBe("function");
  });
});
