import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock templateHelpers so we can control getTemplateForArtifact and isRequiredFieldSatisfied
// without depending on the real template registry.
vi.mock("./templateHelpers.js", () => ({
  getTemplateForArtifact: vi.fn(() => ({ template: null, binding: "missing" })),
  isRequiredFieldSatisfied: vi.fn(() => true),
}));

import {
  isArtifactWaived,
  isArtifactComplete,
  computeArtifactStatus,
  countPhaseWaivers,
  countPhaseCompletedArtifacts,
} from "./artifactState.js";
import { getTemplateForArtifact, isRequiredFieldSatisfied } from "./templateHelpers.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const LONG_TEXT = "This is a rationale with more than twenty characters in it.";
const SHORT_TEXT = "Too short.";

function makeWaivedArtifact(rationaleOverride) {
  return {
    waiver: {
      waived: true,
      rationale: rationaleOverride !== undefined ? rationaleOverride : LONG_TEXT,
    },
  };
}

// ---------------------------------------------------------------------------
// isArtifactWaived
// ---------------------------------------------------------------------------
describe("isArtifactWaived", () => {
  it("returns false for null / undefined artifact", () => {
    expect(isArtifactWaived(null)).toBe(false);
    expect(isArtifactWaived(undefined)).toBe(false);
  });

  it("returns false when artifact has no waiver property", () => {
    expect(isArtifactWaived({})).toBe(false);
    expect(isArtifactWaived({ notes: "hello" })).toBe(false);
  });

  it("returns false when waiver is not an object", () => {
    expect(isArtifactWaived({ waiver: "yes" })).toBe(false);
    expect(isArtifactWaived({ waiver: 42 })).toBe(false);
    expect(isArtifactWaived({ waiver: true })).toBe(false);
  });

  it("returns false when waiver.waived is not true", () => {
    expect(isArtifactWaived({ waiver: { waived: false, rationale: LONG_TEXT } })).toBe(false);
    expect(isArtifactWaived({ waiver: { waived: "true", rationale: LONG_TEXT } })).toBe(false);
    expect(isArtifactWaived({ waiver: { waived: null, rationale: LONG_TEXT } })).toBe(false);
  });

  it("returns false when rationale is too short (< 20 chars)", () => {
    expect(isArtifactWaived({ waiver: { waived: true, rationale: SHORT_TEXT } })).toBe(false);
    expect(isArtifactWaived({ waiver: { waived: true, rationale: "" } })).toBe(false);
  });

  it("returns false when rationale is not a string", () => {
    expect(isArtifactWaived({ waiver: { waived: true, rationale: 12345 } })).toBe(false);
    expect(isArtifactWaived({ waiver: { waived: true, rationale: null } })).toBe(false);
  });

  it("returns false when rationale is only whitespace (trimmed length < 20)", () => {
    expect(isArtifactWaived({ waiver: { waived: true, rationale: "                    " } })).toBe(false);
  });

  it("returns true for a valid waiver with waived=true and rationale >= 20 chars", () => {
    expect(isArtifactWaived(makeWaivedArtifact())).toBe(true);
    // Exactly 20 characters after trim
    expect(isArtifactWaived({ waiver: { waived: true, rationale: "12345678901234567890" } })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isArtifactComplete
// ---------------------------------------------------------------------------
describe("isArtifactComplete", () => {
  beforeEach(() => {
    getTemplateForArtifact.mockReset();
    getTemplateForArtifact.mockReturnValue({ template: null, binding: "missing" });
    isRequiredFieldSatisfied.mockReset();
    isRequiredFieldSatisfied.mockReturnValue(true);
  });

  it("returns false for null / undefined artifact", () => {
    expect(isArtifactComplete(null, 1)).toBe(false);
    expect(isArtifactComplete(undefined, 1)).toBe(false);
  });

  it("returns true when artifact is waived (delegates to isArtifactWaived)", () => {
    expect(isArtifactComplete(makeWaivedArtifact(), 1)).toBe(true);
    // getTemplateForArtifact should NOT be called when waived
    expect(getTemplateForArtifact).not.toHaveBeenCalled();
  });

  it("returns false when binding is mismatch", () => {
    getTemplateForArtifact.mockReturnValue({ template: null, binding: "mismatch" });
    expect(isArtifactComplete({ name: "A" }, 1)).toBe(false);
  });

  it("returns false when binding is unresolved", () => {
    getTemplateForArtifact.mockReturnValue({ template: null, binding: "unresolved" });
    expect(isArtifactComplete({ name: "A" }, 1)).toBe(false);
  });

  it("returns false when binding is registry-corrupt", () => {
    getTemplateForArtifact.mockReturnValue({ template: null, binding: "registry-corrupt" });
    expect(isArtifactComplete({ name: "A" }, 1)).toBe(false);
  });

  it("returns true when template has fields and all required fields are satisfied", () => {
    const template = {
      fields: [
        { fieldId: "f1", required: true, type: "short_text" },
        { fieldId: "f2", required: true, type: "short_text" },
      ],
    };
    getTemplateForArtifact.mockReturnValue({ template, binding: "verified" });
    isRequiredFieldSatisfied.mockReturnValue(true);

    const artifact = { field_values: { f1: "val1", f2: "val2" } };
    expect(isArtifactComplete(artifact, 1)).toBe(true);
    expect(isRequiredFieldSatisfied).toHaveBeenCalledTimes(2);
  });

  it("returns false when template has required fields and one is not satisfied", () => {
    const template = {
      fields: [
        { fieldId: "f1", required: true, type: "short_text" },
        { fieldId: "f2", required: true, type: "short_text" },
      ],
    };
    getTemplateForArtifact.mockReturnValue({ template, binding: "verified" });
    isRequiredFieldSatisfied.mockImplementation((field) => field.fieldId === "f1");

    const artifact = { field_values: { f1: "val1" } };
    expect(isArtifactComplete(artifact, 1)).toBe(false);
  });

  it("returns true when template has fields but none are required", () => {
    const template = {
      fields: [
        { fieldId: "f1", required: false, type: "short_text" },
      ],
    };
    getTemplateForArtifact.mockReturnValue({ template, binding: "verified" });

    expect(isArtifactComplete({ field_values: {} }, 1)).toBe(true);
    // isRequiredFieldSatisfied should NOT be called when there are no required fields
    expect(isRequiredFieldSatisfied).not.toHaveBeenCalled();
  });

  it("falls back to templateData when field_values is absent", () => {
    const template = {
      fields: [{ fieldId: "f1", required: true, type: "short_text" }],
    };
    getTemplateForArtifact.mockReturnValue({ template, binding: "verified" });
    isRequiredFieldSatisfied.mockReturnValue(true);

    const artifact = { templateData: { f1: "value" } };
    expect(isArtifactComplete(artifact, 1)).toBe(true);
    expect(isRequiredFieldSatisfied).toHaveBeenCalledWith(
      expect.objectContaining({ fieldId: "f1" }),
      "value",
    );
  });

  it("returns true for non-templated artifact with rationale >= 20 chars", () => {
    // template is null, binding is "missing" (default mock)
    expect(isArtifactComplete({ rationale: LONG_TEXT }, 1)).toBe(true);
  });

  it("returns true for non-templated artifact with notes >= 20 chars", () => {
    expect(isArtifactComplete({ notes: LONG_TEXT }, 1)).toBe(true);
  });

  it("returns false for non-templated artifact without sufficient content", () => {
    expect(isArtifactComplete({ rationale: SHORT_TEXT }, 1)).toBe(false);
    expect(isArtifactComplete({ notes: SHORT_TEXT }, 1)).toBe(false);
    expect(isArtifactComplete({}, 1)).toBe(false);
  });

  it("returns true when template exists but has empty fields array (non-templated path)", () => {
    getTemplateForArtifact.mockReturnValue({
      template: { fields: [] },
      binding: "verified",
    });
    // Empty fields array means the template check is skipped, falls through to rationale/notes
    expect(isArtifactComplete({ rationale: LONG_TEXT }, 1)).toBe(true);
  });

  it("passes correct phase shape to getTemplateForArtifact", () => {
    getTemplateForArtifact.mockReturnValue({ template: null, binding: "missing" });
    isArtifactComplete({ rationale: LONG_TEXT }, 3);
    expect(getTemplateForArtifact).toHaveBeenCalledWith(
      { id: 3, phase_number: 3 },
      expect.any(Object),
    );
  });
});

// ---------------------------------------------------------------------------
// computeArtifactStatus
// ---------------------------------------------------------------------------
describe("computeArtifactStatus", () => {
  beforeEach(() => {
    getTemplateForArtifact.mockReset();
    getTemplateForArtifact.mockReturnValue({ template: null, binding: "missing" });
    isRequiredFieldSatisfied.mockReset();
    isRequiredFieldSatisfied.mockReturnValue(true);
  });

  it('returns "not-started" for null / undefined artifact', () => {
    expect(computeArtifactStatus(null, 1)).toBe("not-started");
    expect(computeArtifactStatus(undefined, 1)).toBe("not-started");
  });

  it('returns "waived" when artifact is waived', () => {
    expect(computeArtifactStatus(makeWaivedArtifact(), 1)).toBe("waived");
  });

  it('returns "complete" when artifact is complete (non-templated with long rationale)', () => {
    expect(computeArtifactStatus({ rationale: LONG_TEXT }, 1)).toBe("complete");
  });

  it('returns "complete" when artifact is complete via template fields', () => {
    const template = {
      fields: [{ fieldId: "f1", required: true, type: "short_text" }],
    };
    getTemplateForArtifact.mockReturnValue({ template, binding: "verified" });
    isRequiredFieldSatisfied.mockReturnValue(true);

    expect(computeArtifactStatus({ field_values: { f1: "val" } }, 1)).toBe("complete");
  });

  it('returns "in-progress" when artifact has some rationale but not enough for complete', () => {
    expect(computeArtifactStatus({ rationale: "a" }, 1)).toBe("in-progress");
  });

  it('returns "in-progress" when artifact has some notes but not enough for complete', () => {
    expect(computeArtifactStatus({ notes: "x" }, 1)).toBe("in-progress");
  });

  it('returns "in-progress" when artifact has templateData with content', () => {
    expect(computeArtifactStatus({ templateData: { field1: "some value" } }, 1)).toBe("in-progress");
  });

  it('returns "in-progress" when artifact has field_values with content', () => {
    expect(computeArtifactStatus({ field_values: { f1: "data" } }, 1)).toBe("in-progress");
  });

  it('returns "in-progress" when artifact has non-empty comments array', () => {
    expect(computeArtifactStatus({ comments: ["comment1"] }, 1)).toBe("in-progress");
  });

  it('returns "in-progress" when field_values contain a number', () => {
    expect(computeArtifactStatus({ field_values: { score: 42 } }, 1)).toBe("in-progress");
  });

  it('returns "in-progress" when field_values contain a boolean', () => {
    expect(computeArtifactStatus({ field_values: { done: false } }, 1)).toBe("in-progress");
  });

  it('returns "in-progress" when field_values contain a non-empty array', () => {
    expect(computeArtifactStatus({ field_values: { items: ["a"] } }, 1)).toBe("in-progress");
  });

  it('returns "in-progress" when field_values contain a non-empty object', () => {
    expect(computeArtifactStatus({ field_values: { nested: { a: 1 } } }, 1)).toBe("in-progress");
  });

  it('returns "not-started" when artifact is empty object with no content', () => {
    expect(computeArtifactStatus({}, 1)).toBe("not-started");
  });

  it('returns "not-started" when all fields are empty/null', () => {
    expect(computeArtifactStatus({ rationale: "", notes: "", field_values: {} }, 1)).toBe("not-started");
  });

  it('returns "not-started" when field_values only contain null values', () => {
    expect(computeArtifactStatus({ field_values: { f1: null, f2: null } }, 1)).toBe("not-started");
  });

  it('returns "not-started" when field_values only contain empty strings', () => {
    expect(computeArtifactStatus({ field_values: { f1: "", f2: "   " } }, 1)).toBe("not-started");
  });

  it('returns "not-started" when comments is an empty array', () => {
    expect(computeArtifactStatus({ comments: [] }, 1)).toBe("not-started");
  });

  it('returns "not-started" when field_values contain empty arrays', () => {
    expect(computeArtifactStatus({ field_values: { items: [] } }, 1)).toBe("not-started");
  });

  it('returns "not-started" when field_values contain empty objects', () => {
    expect(computeArtifactStatus({ field_values: { nested: {} } }, 1)).toBe("not-started");
  });
});

// ---------------------------------------------------------------------------
// countPhaseWaivers
// ---------------------------------------------------------------------------
describe("countPhaseWaivers", () => {
  it("returns 0 for null / undefined phase", () => {
    expect(countPhaseWaivers(null)).toBe(0);
    expect(countPhaseWaivers(undefined)).toBe(0);
  });

  it("returns 0 when phase has no artifacts", () => {
    expect(countPhaseWaivers({})).toBe(0);
    expect(countPhaseWaivers({ artifacts: [] })).toBe(0);
  });

  it("returns 0 when no artifacts are waived", () => {
    const phase = {
      artifacts: [
        { name: "A", rationale: LONG_TEXT },
        { name: "B", waiver: { waived: false, rationale: LONG_TEXT } },
      ],
    };
    expect(countPhaseWaivers(phase)).toBe(0);
  });

  it("counts only properly waived artifacts", () => {
    const phase = {
      artifacts: [
        makeWaivedArtifact(),
        { name: "B", rationale: LONG_TEXT },
        makeWaivedArtifact(),
        { name: "D", waiver: { waived: true, rationale: SHORT_TEXT } }, // rationale too short
      ],
    };
    expect(countPhaseWaivers(phase)).toBe(2);
  });

  it("returns correct count when all artifacts are waived", () => {
    const phase = {
      artifacts: [makeWaivedArtifact(), makeWaivedArtifact(), makeWaivedArtifact()],
    };
    expect(countPhaseWaivers(phase)).toBe(3);
  });
});

// ---------------------------------------------------------------------------
// countPhaseCompletedArtifacts
// ---------------------------------------------------------------------------
describe("countPhaseCompletedArtifacts", () => {
  beforeEach(() => {
    getTemplateForArtifact.mockReset();
    getTemplateForArtifact.mockReturnValue({ template: null, binding: "missing" });
    isRequiredFieldSatisfied.mockReset();
    isRequiredFieldSatisfied.mockReturnValue(true);
  });

  it("returns 0 for null / undefined phase", () => {
    expect(countPhaseCompletedArtifacts(null)).toBe(0);
    expect(countPhaseCompletedArtifacts(undefined)).toBe(0);
  });

  it("returns 0 when phase has no artifacts", () => {
    expect(countPhaseCompletedArtifacts({ id: 1, artifacts: [] })).toBe(0);
  });

  it("returns 0 when no artifacts are complete", () => {
    const phase = {
      id: 1,
      artifacts: [
        { name: "A", rationale: SHORT_TEXT },
        { name: "B" },
      ],
    };
    expect(countPhaseCompletedArtifacts(phase)).toBe(0);
  });

  it("counts waived artifacts as complete", () => {
    const phase = {
      id: 1,
      artifacts: [
        makeWaivedArtifact(),
        { name: "B" },
      ],
    };
    expect(countPhaseCompletedArtifacts(phase)).toBe(1);
  });

  it("counts artifacts with long rationale as complete (non-templated)", () => {
    const phase = {
      id: 1,
      artifacts: [
        { name: "A", rationale: LONG_TEXT },
        { name: "B", notes: LONG_TEXT },
        { name: "C", rationale: SHORT_TEXT },
      ],
    };
    expect(countPhaseCompletedArtifacts(phase)).toBe(2);
  });

  it("counts mix of waived and content-complete artifacts", () => {
    const phase = {
      id: 2,
      artifacts: [
        makeWaivedArtifact(),
        { name: "B", rationale: LONG_TEXT },
        { name: "C" },
        { name: "D", notes: LONG_TEXT },
      ],
    };
    expect(countPhaseCompletedArtifacts(phase)).toBe(3);
  });

  it("passes phase.id to isArtifactComplete", () => {
    const phase = {
      id: 5,
      artifacts: [{ name: "A", rationale: LONG_TEXT }],
    };
    countPhaseCompletedArtifacts(phase);
    expect(getTemplateForArtifact).toHaveBeenCalledWith(
      expect.objectContaining({ id: 5, phase_number: 5 }),
      expect.any(Object),
    );
  });
});
