import { describe, it, expect } from "vitest";
import { statusGlyph, statusLabel, artifactGlyph } from "./statusHelpers.js";

describe("statusGlyph", () => {
  it("maps statuses to correct glyphs", () => {
    expect(statusGlyph("complete")).toBe("check");
    expect(statusGlyph("waived")).toBe("waiver");
    expect(statusGlyph("in-progress")).toBe("modify");
    expect(statusGlyph("not-started")).toBe("pending");
    expect(statusGlyph("unknown")).toBe("pending");
  });
});

describe("statusLabel", () => {
  it("maps statuses to correct labels", () => {
    expect(statusLabel("complete")).toBe("Complete");
    expect(statusLabel("waived")).toBe("Waived");
    expect(statusLabel("in-progress")).toBe("In Progress");
    expect(statusLabel("not-started")).toBe("Not Started");
  });
});

describe("artifactGlyph", () => {
  it("maps categories to correct glyphs", () => {
    expect(artifactGlyph("core")).toBe("artifact");
    expect(artifactGlyph("conditional")).toBe("field");
    expect(artifactGlyph("supplemental")).toBe("template");
  });
});
