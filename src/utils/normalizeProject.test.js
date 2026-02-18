import { describe, it, expect } from "vitest";
import { normalizeProject } from "./normalizeProject.js";

function baseProject(overrides = {}) {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    id: "p1",
    name: "P",
    description: "",
    governance_mode: "solo",
    project_owner: "owner:laptop",
    created: now,
    lastModified: now,
    lastSavedFrom: "laptop",
    phases: Array.from({ length: 6 }, (_, i) => ({
      id: i + 1,
      name: `Phase ${i + 1}`,
      goNoGoDecision: { status: "pending", decidedAt: null, notes: "", attestation_type: "solo_attestation" },
      artifacts: [],
    })),
    ...overrides,
  };
}

describe("normalizeProject template_set_profile normalization", () => {
  it("keeps string template_set_profile", () => {
    const p = baseProject({ template_set_profile: "minimum-compliance" });
    const n = normalizeProject(p);
    expect(n.template_set_profile).toBe("minimum-compliance");
  });

  it("repairs legacy spread-string object template_set_profile and preserves registry_version", () => {
    const legacy = {
      0: "m",
      1: "i",
      2: "n",
      3: "i",
      4: "m",
      5: "u",
      6: "m",
      7: "-",
      8: "c",
      9: "o",
      10: "m",
      11: "p",
      12: "l",
      13: "i",
      14: "a",
      15: "n",
      16: "c",
      17: "e",
      registry_version: "1.0",
    };
    const p = baseProject({ template_set_profile: legacy });
    const n = normalizeProject(p);
    expect(n.template_set_profile).toBe("minimum-compliance");
    expect(n.template_registry_version).toBe("1.0");
  });

  it("accepts object form {profile, registry_version}", () => {
    const p = baseProject({ template_set_profile: { profile: "standard", registry_version: "1.0" } });
    const n = normalizeProject(p);
    expect(n.template_set_profile).toBe("standard");
    expect(n.template_registry_version).toBe("1.0");
  });
});

describe("normalizeProject – openclaw block", () => {
  it("adds openclaw scaffold when project has no openclaw key", () => {
    const p = baseProject();
    const n = normalizeProject(p);
    expect(n.openclaw).toEqual({
      linkedAgentIds: [],
      lastAgentHeartbeat: null,
      advisoryDrafts: {},
    });
  });

  it("preserves existing linkedAgentIds after normalization (does not reset)", () => {
    const p = baseProject({ openclaw: { linkedAgentIds: ["agent-42"], lastAgentHeartbeat: null, advisoryDrafts: {} } });
    const n = normalizeProject(p);
    expect(n.openclaw.linkedAgentIds).toEqual(["agent-42"]);
  });

  it("preserves existing advisoryDrafts after normalization", () => {
    const p = baseProject({ openclaw: { linkedAgentIds: [], lastAgentHeartbeat: null, advisoryDrafts: { "d1": { content: "hello" } } } });
    const n = normalizeProject(p);
    expect(n.openclaw.advisoryDrafts).toEqual({ "d1": { content: "hello" } });
  });

  it("fills in missing fields when openclaw is partial", () => {
    const p = baseProject({ openclaw: { linkedAgentIds: ["x"] } });
    const n = normalizeProject(p);
    expect(n.openclaw.linkedAgentIds).toEqual(["x"]);
    expect(n.openclaw.lastAgentHeartbeat).toBeNull();
    expect(n.openclaw.advisoryDrafts).toEqual({});
  });

  it("replaces non-object openclaw values with the safe default scaffold", () => {
    for (const bad of [null, "bad", 42, true, []]) {
      const p = baseProject({ openclaw: bad });
      const n = normalizeProject(p);
      expect(n.openclaw).toEqual({
        linkedAgentIds: [],
        lastAgentHeartbeat: null,
        advisoryDrafts: {},
      });
    }
  });
});

