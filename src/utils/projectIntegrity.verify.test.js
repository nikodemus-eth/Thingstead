import { describe, it, expect } from "vitest";
import { computeProjectIntegrity, verifyProjectIntegrity } from "./projectIntegrity.js";

describe("verifyProjectIntegrity", () => {
  const validProject = {
    id: "v-1",
    name: "Verified",
    meta: { schema_version: "1" },
    phases: [
      {
        id: 1,
        phase_number: 1,
        name: "P1",
        artifacts: [{ id: "a1", name: "Art1" }],
      },
    ],
  };

  it("returns ok:true for a project with valid integrity hash", () => {
    const integrity = computeProjectIntegrity(validProject);
    const withIntegrity = { ...validProject, integrity };
    const result = verifyProjectIntegrity(withIntegrity);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("returns ok:false when integrity hash is tampered", () => {
    const integrity = computeProjectIntegrity(validProject);
    const tampered = { ...validProject, name: "Tampered", integrity };
    const result = verifyProjectIntegrity(tampered);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("hash"))).toBe(true);
  });

  it("returns ok:true (with warning) when no integrity field exists", () => {
    const result = verifyProjectIntegrity(validProject);
    expect(result.ok).toBe(true);
    expect(result.warnings.some((w) => w.includes("integrity"))).toBe(true);
  });

  it("detects duplicate phase IDs", () => {
    const dup = {
      ...validProject,
      phases: [
        { id: 1, phase_number: 1, name: "P1", artifacts: [] },
        { id: 1, phase_number: 2, name: "P2", artifacts: [] },
      ],
    };
    const result = verifyProjectIntegrity(dup);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("phase"))).toBe(true);
  });

  it("detects duplicate artifact IDs across phases", () => {
    const dup = {
      ...validProject,
      phases: [
        { id: 1, phase_number: 1, name: "P1", artifacts: [{ id: "a1", name: "Art1" }] },
        { id: 2, phase_number: 2, name: "P2", artifacts: [{ id: "a1", name: "Art2" }] },
      ],
    };
    const result = verifyProjectIntegrity(dup);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.includes("artifact"))).toBe(true);
  });
});
