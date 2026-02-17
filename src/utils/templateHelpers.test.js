import { describe, it, expect, vi } from "vitest";

// Mock the templateRegistry module so getTemplateForArtifact tests are isolated
// from the real JSON registry.
vi.mock("../modules/templateRegistry/index.js", () => ({
  getTemplateVersion: vi.fn(),
  findTemplateLegacyByPhaseAndName: vi.fn(),
}));

import {
  hasText,
  isRequiredFieldSatisfied,
  defaultCellValue,
  getTemplateForArtifact,
} from "./templateHelpers.js";

import {
  getTemplateVersion,
  findTemplateLegacyByPhaseAndName,
} from "../modules/templateRegistry/index.js";

// ---------------------------------------------------------------------------
// hasText
// ---------------------------------------------------------------------------
describe("hasText", () => {
  it("returns false for non-string values", () => {
    expect(hasText(undefined)).toBe(false);
    expect(hasText(null)).toBe(false);
    expect(hasText(0)).toBe(false);
    expect(hasText(123)).toBe(false);
    expect(hasText(true)).toBe(false);
    expect(hasText([])).toBe(false);
    expect(hasText({})).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(hasText("")).toBe(false);
  });

  it("returns false for whitespace-only strings", () => {
    expect(hasText(" ")).toBe(false);
    expect(hasText("   ")).toBe(false);
    expect(hasText("\t")).toBe(false);
    expect(hasText("\n")).toBe(false);
    expect(hasText("  \t\n  ")).toBe(false);
  });

  it("returns true for strings with visible content", () => {
    expect(hasText("a")).toBe(true);
    expect(hasText("hello")).toBe(true);
    expect(hasText("  hello  ")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// defaultCellValue
// ---------------------------------------------------------------------------
describe("defaultCellValue", () => {
  it("returns the first option for a selection column", () => {
    const col = { type: "selection", options: ["alpha", "beta"] };
    expect(defaultCellValue(col)).toBe("alpha");
  });

  it("returns empty string when selection column has empty options array", () => {
    const col = { type: "selection", options: [] };
    expect(defaultCellValue(col)).toBe("");
  });

  it("returns empty string when selection column has no options property", () => {
    const col = { type: "selection" };
    expect(defaultCellValue(col)).toBe("");
  });

  it("returns empty string for non-selection columns", () => {
    expect(defaultCellValue({ type: "short_text" })).toBe("");
    expect(defaultCellValue({ type: "date" })).toBe("");
  });

  it("returns empty string when column is null or undefined", () => {
    expect(defaultCellValue(null)).toBe("");
    expect(defaultCellValue(undefined)).toBe("");
  });
});

// ---------------------------------------------------------------------------
// isRequiredFieldSatisfied
// ---------------------------------------------------------------------------
describe("isRequiredFieldSatisfied", () => {
  describe("non-required fields", () => {
    it("returns true when field is not required", () => {
      expect(isRequiredFieldSatisfied({ required: false, type: "short_text" }, "")).toBe(true);
    });

    it("returns true when field is null or undefined", () => {
      expect(isRequiredFieldSatisfied(null, "")).toBe(true);
      expect(isRequiredFieldSatisfied(undefined, "")).toBe(true);
    });

    it("returns true when required is absent", () => {
      expect(isRequiredFieldSatisfied({ type: "short_text" }, "")).toBe(true);
    });
  });

  describe("short_text", () => {
    const field = { required: true, type: "short_text" };

    it("returns false for empty string", () => {
      expect(isRequiredFieldSatisfied(field, "")).toBe(false);
    });

    it("returns false for whitespace-only string", () => {
      expect(isRequiredFieldSatisfied(field, "   ")).toBe(false);
    });

    it("returns true for non-empty string", () => {
      expect(isRequiredFieldSatisfied(field, "hello")).toBe(true);
    });

    it("returns false for non-string values", () => {
      expect(isRequiredFieldSatisfied(field, null)).toBe(false);
      expect(isRequiredFieldSatisfied(field, undefined)).toBe(false);
      expect(isRequiredFieldSatisfied(field, 42)).toBe(false);
    });
  });

  describe("long_text with minLength", () => {
    const field = {
      required: true,
      type: "long_text",
      validation: { minLength: 5 },
    };

    it("returns false when trimmed length is below minLength", () => {
      expect(isRequiredFieldSatisfied(field, "abc")).toBe(false);
      expect(isRequiredFieldSatisfied(field, "  ab  ")).toBe(false);
    });

    it("returns true when trimmed length meets minLength", () => {
      expect(isRequiredFieldSatisfied(field, "abcde")).toBe(true);
      expect(isRequiredFieldSatisfied(field, "  abcde  ")).toBe(true);
    });

    it("returns true for long_text without minLength validation", () => {
      const noMinField = { required: true, type: "long_text" };
      expect(isRequiredFieldSatisfied(noMinField, "x")).toBe(true);
    });
  });

  describe("selection", () => {
    const field = { required: true, type: "selection" };

    it("returns true for non-empty selection", () => {
      expect(isRequiredFieldSatisfied(field, "Option A")).toBe(true);
    });

    it("returns false for empty or blank selection", () => {
      expect(isRequiredFieldSatisfied(field, "")).toBe(false);
      expect(isRequiredFieldSatisfied(field, "   ")).toBe(false);
    });
  });

  describe("date", () => {
    const field = { required: true, type: "date" };

    it("returns true for non-empty date string", () => {
      expect(isRequiredFieldSatisfied(field, "2026-01-01")).toBe(true);
    });

    it("returns false for empty date", () => {
      expect(isRequiredFieldSatisfied(field, "")).toBe(false);
    });
  });

  describe("checklist", () => {
    const field = { required: true, type: "checklist" };

    it("returns true for non-empty array", () => {
      expect(isRequiredFieldSatisfied(field, ["item"])).toBe(true);
    });

    it("returns false for empty array", () => {
      expect(isRequiredFieldSatisfied(field, [])).toBe(false);
    });

    it("returns false for non-array values", () => {
      expect(isRequiredFieldSatisfied(field, null)).toBe(false);
      expect(isRequiredFieldSatisfied(field, "string")).toBe(false);
    });
  });

  describe("table", () => {
    const field = {
      required: true,
      type: "table",
      columns: [{ name: "col1" }, { name: "col2" }],
    };

    it("returns false for empty array", () => {
      expect(isRequiredFieldSatisfied(field, [])).toBe(false);
    });

    it("returns false for non-array value", () => {
      expect(isRequiredFieldSatisfied(field, null)).toBe(false);
      expect(isRequiredFieldSatisfied(field, "oops")).toBe(false);
    });

    it("returns true when at least one row has all columns filled", () => {
      const rows = [{ col1: "a", col2: "b" }];
      expect(isRequiredFieldSatisfied(field, rows)).toBe(true);
    });

    it("returns false when no row has all columns filled", () => {
      const rows = [{ col1: "a", col2: "" }];
      expect(isRequiredFieldSatisfied(field, rows)).toBe(false);
    });

    it("returns true if any row satisfies (not all)", () => {
      const rows = [
        { col1: "", col2: "" },
        { col1: "x", col2: "y" },
      ];
      expect(isRequiredFieldSatisfied(field, rows)).toBe(true);
    });

    it("handles table field with no columns property", () => {
      const noColField = { required: true, type: "table" };
      // columns defaults to [], so every([]) is true for any row
      const rows = [{}];
      expect(isRequiredFieldSatisfied(noColField, rows)).toBe(true);
    });
  });

  describe("unknown field type", () => {
    it("returns true for unrecognized types when required", () => {
      const field = { required: true, type: "unknown_type" };
      expect(isRequiredFieldSatisfied(field, undefined)).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// getTemplateForArtifact
// ---------------------------------------------------------------------------
describe("getTemplateForArtifact", () => {
  const fakeTemplate = { template_hash: "hash-abc", fields: [] };

  it('returns binding "missing" when artifact is null or undefined', () => {
    expect(getTemplateForArtifact({}, null)).toEqual({ template: null, binding: "missing" });
    expect(getTemplateForArtifact({}, undefined)).toEqual({ template: null, binding: "missing" });
  });

  describe("modern binding path (templateId + version)", () => {
    it('returns binding "unresolved" when registry has no match', () => {
      getTemplateVersion.mockReturnValue(null);

      const artifact = { template_id: "tpl-1", template_version: "1.0" };
      expect(getTemplateForArtifact({}, artifact)).toEqual({
        template: null,
        binding: "unresolved",
      });
      expect(getTemplateVersion).toHaveBeenCalledWith("tpl-1", "1.0");
    });

    it('returns binding "verified" when hash matches', () => {
      getTemplateVersion.mockReturnValue(fakeTemplate);

      const artifact = {
        template_id: "tpl-1",
        template_version: "1.0",
        template_hash: "hash-abc",
      };
      expect(getTemplateForArtifact({}, artifact)).toEqual({
        template: fakeTemplate,
        binding: "verified",
      });
    });

    it('returns binding "mismatch" when hash does not match', () => {
      getTemplateVersion.mockReturnValue(fakeTemplate);

      const artifact = {
        template_id: "tpl-1",
        template_version: "1.0",
        template_hash: "hash-WRONG",
      };
      expect(getTemplateForArtifact({}, artifact)).toEqual({
        template: null,
        binding: "mismatch",
      });
    });

    it('returns binding "unverified" when artifact has no stored hash', () => {
      getTemplateVersion.mockReturnValue(fakeTemplate);

      const artifact = { template_id: "tpl-1", template_version: "1.0" };
      expect(getTemplateForArtifact({}, artifact)).toEqual({
        template: fakeTemplate,
        binding: "unverified",
      });
    });

    it('returns binding "unverified" when stored hash is empty string', () => {
      getTemplateVersion.mockReturnValue(fakeTemplate);

      const artifact = {
        template_id: "tpl-1",
        template_version: "1.0",
        template_hash: "",
      };
      expect(getTemplateForArtifact({}, artifact)).toEqual({
        template: fakeTemplate,
        binding: "unverified",
      });
    });
  });

  describe("legacy binding path (no templateId)", () => {
    it('returns binding "legacy" when legacy lookup finds a match', () => {
      const legacyTpl = { name: "Risk Register", fields: [] };
      findTemplateLegacyByPhaseAndName.mockReturnValue(legacyTpl);

      const phase = { phase_number: 3 };
      const artifact = { name: "Risk Register" };
      expect(getTemplateForArtifact(phase, artifact)).toEqual({
        template: legacyTpl,
        binding: "legacy",
      });
      expect(findTemplateLegacyByPhaseAndName).toHaveBeenCalledWith(3, "Risk Register");
    });

    it('returns binding "missing" when legacy lookup finds nothing', () => {
      findTemplateLegacyByPhaseAndName.mockReturnValue(null);

      const phase = { phase_number: 3 };
      const artifact = { name: "Nonexistent" };
      expect(getTemplateForArtifact(phase, artifact)).toEqual({
        template: null,
        binding: "missing",
      });
    });

    it("uses phase.id when phase_number is not present", () => {
      findTemplateLegacyByPhaseAndName.mockReturnValue(null);

      const phase = { id: 5 };
      const artifact = { name: "Something" };
      getTemplateForArtifact(phase, artifact);
      expect(findTemplateLegacyByPhaseAndName).toHaveBeenCalledWith(5, "Something");
    });

    it("falls through to legacy when template_id is blank or whitespace", () => {
      findTemplateLegacyByPhaseAndName.mockReturnValue(null);

      const phase = { phase_number: 1 };
      const artifact = { name: "Foo", template_id: "   " };
      getTemplateForArtifact(phase, artifact);
      expect(findTemplateLegacyByPhaseAndName).toHaveBeenCalledWith(1, "Foo");
    });

    it("falls through to legacy when template_version is falsy", () => {
      findTemplateLegacyByPhaseAndName.mockReturnValue(null);

      const phase = { phase_number: 2 };
      const artifact = { name: "Bar", template_id: "tpl-1", template_version: null };
      getTemplateForArtifact(phase, artifact);
      expect(findTemplateLegacyByPhaseAndName).toHaveBeenCalledWith(2, "Bar");
    });
  });
});
