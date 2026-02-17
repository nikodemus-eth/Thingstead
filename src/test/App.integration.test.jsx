import React from "react";
import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App.jsx";
import { loadProject } from "../utils/storage.js";
import {
  findFirstArtifactButton,
  createProject,
  openArtifact,
  switchToDirectMode,
  applyWaiver,
} from "./helpers/appTestHelpers.js";

describe("CPMAI Tracker Integration: Gate + Artifacts + Undo/Redo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it(
    "Template-driven fields render and completion is computed (no manual status)",
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await createProject(user, "Template Project");

      // Sanity: project artifacts should have unique IDs (React keys rely on this).
      const stored = loadProject("00000000-0000-4000-8000-000000000001");
      if (stored?.current?.phases) {
        const ids = [];
        for (const p of stored.current.phases) {
          for (const a of p.artifacts || []) ids.push(a.id);
        }
        expect(new Set(ids).size).toBe(ids.length);
      }

      // Open a known templated artifact in phase 1.
      await openArtifact(user, "Problem Definition Document");

      expect(
        screen.getByText(/problem definition document template/i)
      ).toBeInTheDocument();

      // Default mode is Guided; switch to Direct to fill quickly.
      await switchToDirectMode(user);

      // Initially, artifact should not be computed complete.
      const artifactBtn = screen.getByRole("button", { name: /problem definition document/i });
      expect(artifactBtn.textContent || "").toMatch(/not-started|in-progress/i);

      // Fill required template fields (minLength enforced by templateHelpers).
      const fillTemplateLongText = async (labelText, value) => {
        const label = screen.getByText(labelText);
        const fieldWrap = label.closest("div");
        if (!fieldWrap) throw new Error(`Missing template field wrapper for: ${labelText}`);
        const textbox = fieldWrap.querySelector("textarea, input");
        if (!textbox) throw new Error(`Missing template textbox for: ${labelText}`);
        await user.clear(textbox);
        await user.type(textbox, value);
      };

      const pickTemplateSelection = async (labelText) => {
        const label = screen.getByText(labelText);
        const fieldWrap = label.closest("div");
        if (!fieldWrap) throw new Error(`Missing template field wrapper for: ${labelText}`);
        const select = fieldWrap.querySelector("select");
        if (!select) throw new Error(`Missing template select for: ${labelText}`);
        const options = Array.from(select.querySelectorAll("option"));
        const firstReal = options.find((opt) => (opt.value || "").trim().length > 0);
        if (!firstReal) throw new Error(`No selectable options for: ${labelText}`);
        await user.selectOptions(select, firstReal.value);
      };

      const fillTemplateTableRow = async (labelText) => {
        const label = screen.getByText(labelText);
        const fieldWrap = label.closest("div");
        if (!fieldWrap) throw new Error(`Missing template field wrapper for: ${labelText}`);
        const addRowBtn = Array.from(fieldWrap.querySelectorAll("button")).find((b) =>
          (b.textContent || "").toLowerCase().includes("add row")
        );
        if (!addRowBtn) throw new Error(`Missing Add Row button for: ${labelText}`);
        await user.click(addRowBtn);

        const rowInputs = fieldWrap.querySelectorAll("tbody tr:first-child input");
        if (!rowInputs || rowInputs.length === 0) {
          throw new Error(`Missing table row inputs for: ${labelText}`);
        }
        const values = [
          "Classify tickets by intent",
          "85% accuracy",
          "Manual at 60%",
          "75% accuracy",
        ];
        for (let i = 0; i < rowInputs.length; i++) {
          await user.clear(rowInputs[i]);
          await user.type(rowInputs[i], values[i] || "value");
        }
      };

      await fillTemplateLongText(
        /business problem statement/i,
        "This statement is intentionally long enough to satisfy the minimum length validation for required fields."
      );
      await fillTemplateLongText(
        /current non-ai approach/i,
        "A sufficiently detailed description of the current heuristic baseline to satisfy the required field validation."
      );
      await fillTemplateLongText(
        /justification for ai over non-cognitive solution/i,
        "A sufficiently detailed justification explaining why a cognitive approach is required, long enough to satisfy validation."
      );

      await pickTemplateSelection(/ai pattern classification/i);
      await pickTemplateSelection(/problem scope/i);
      await pickTemplateSelection(/dikuw target level/i);
      await fillTemplateTableRow(/cognitive objectives/i);

      // Completion is computed; the artifact should now read as complete.
      expect((artifactBtn.textContent || "").toLowerCase()).toContain("complete");
    },
    25000
  );

  it(
    "Gate stays locked until gate-blocking artifacts are completed or waived with a 20+ char rationale",
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await createProject(user);

      expect(await screen.findByText(/PHASE 1 GATE: LOCKED/i)).toBeInTheDocument();

      // Waive all Phase 1 gate-blocking artifacts.
      const gateBlockingArtifacts = [
        "Problem Definition Document",
        "Stakeholder Analysis",
        "Success Criteria",
        "Project Charter",
      ];

      for (const name of gateBlockingArtifacts) {
        await openArtifact(user, name);
        await switchToDirectMode(user);
        await applyWaiver(user, "This waiver is justified for this run.");
      }

      expect(await screen.findByText(/PHASE 1 GATE: READY/i)).toBeInTheDocument();
    },
    25000
  );

  it(
    "Allows GO decision only when gate is ready; persists and can be edited",
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await createProject(user);
      const gateBlockingArtifacts = [
        "Problem Definition Document",
        "Stakeholder Analysis",
        "Success Criteria",
        "Project Charter",
      ];
      for (const name of gateBlockingArtifacts) {
        await openArtifact(user, name);
        await switchToDirectMode(user);
        await applyWaiver(user, "This waiver is justified for this run.");
      }

      expect(await screen.findByText(/PHASE 1 GATE: READY/i)).toBeInTheDocument();

      const notes = screen.getByLabelText(/notes/i);
      await user.type(notes, "Approved for build-out.");
      await user.click(screen.getByRole("button", { name: /^go$/i }));

      expect(screen.getByText(/decision:\s*GO/i)).toBeInTheDocument();
      expect(screen.getByText(/approved for build-out/i)).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /edit decision/i }));
      expect(screen.getByText(/gate ready/i)).toBeInTheDocument();
    },
    25000
  );

  it("Undo/Redo hotkeys revert artifact edits", async () => {
    const user = userEvent.setup();
    render(<App />);

    await createProject(user);

    const artifactBtn = findFirstArtifactButton();
    await user.click(artifactBtn);

    await switchToDirectMode(user);
    const rationaleBox = screen.getByLabelText(/rationale/i);
    fireEvent.change(rationaleBox, { target: { value: "First rationale." } });
    fireEvent.change(rationaleBox, {
      target: { value: "First rationale. Second rationale." },
    });
    expect(screen.getByLabelText(/rationale/i).value).toContain("Second rationale");

    fireEvent.keyDown(window, { key: "z", ctrlKey: true });
    const rationaleAfterUndo = screen.getByLabelText(/rationale/i);
    expect(rationaleAfterUndo.value).toContain("First rationale");
    expect(rationaleAfterUndo.value).not.toContain("Second rationale");

    fireEvent.keyDown(window, { key: "z", ctrlKey: true, shiftKey: true });
    const rationaleAfterRedo = screen.getByLabelText(/rationale/i);
    expect(rationaleAfterRedo.value).toContain("Second rationale");
  });

  it("Computed status flips between not-started and in-progress based on content", async () => {
    const user = userEvent.setup();
    render(<App />);

    await createProject(user);

    const artifactBtn = findFirstArtifactButton();
    await user.click(artifactBtn);

    expect((artifactBtn.textContent || "").toLowerCase()).toContain("not-started");

    await switchToDirectMode(user);
    const rationaleBox = screen.getByLabelText(/rationale/i);
    await user.type(rationaleBox, "Initial artifact details.");
    expect((artifactBtn.textContent || "").toLowerCase()).toContain("in-progress");

    await user.clear(rationaleBox);
    expect((artifactBtn.textContent || "").toLowerCase()).toContain("not-started");
  });
});
