import { describe, it, expect } from "vitest";
import {
  templateRegistry,
  getAllTemplateIds,
  findTemplateLegacyByPhaseAndName,
} from "./index.js";

describe("templateRegistry module", () => {
  it("loads the registry and exposes templates", () => {
    expect(templateRegistry).toBeTruthy();
    expect(typeof templateRegistry).toBe("object");
    const templates = getAllTemplateIds();
    expect(Array.isArray(templates)).toBe(true);
    expect(templates.length).toBeGreaterThan(0);
  });

  it("finds templates by phase and artifact name", () => {
    const t = findTemplateLegacyByPhaseAndName(1, "Problem Definition Document");
    expect(t).toBeTruthy();
    expect(t.phase_number).toBe(1);
    expect(t.name).toBe("Problem Definition Document");
    expect(Array.isArray(t.fields)).toBe(true);
    expect(t.fields.length).toBeGreaterThan(0);
  });
});
