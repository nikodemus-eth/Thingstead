import { screen, waitFor } from "@testing-library/react";
import { expect } from "vitest";

export function findArtifactListButtonByName(name) {
  const lower = String(name || "").toLowerCase();
  const statusRe = /(not-started|in-progress|complete|waived)/i;
  const buttons = screen.getAllByRole("button");
  const match = buttons.find((btn) => {
    const text = (btn.textContent || "").toLowerCase();
    return text.includes(lower) && statusRe.test(text);
  });
  if (!match) {
    throw new Error(`Could not find artifact list button for: ${name}`);
  }
  return match;
}

export function findActiveArtifactListButton() {
  const statusRe = /(not-started|in-progress|complete|waived)/i;
  const buttons = screen.getAllByRole("button");
  const match = buttons.find((btn) => {
    const cls = String(btn.className || "");
    if (!/activeArtifact/i.test(cls)) return false;
    const text = btn.textContent || "";
    return statusRe.test(text);
  });
  if (!match) throw new Error("Could not find active artifact button.");
  return match;
}

export function findFirstArtifactButton() {
  const artifactButtons = screen.getAllByRole("button").filter((btn) => {
    const text = btn.textContent || "";
    return (
      text.includes("not-started") ||
      text.includes("in-progress") ||
      text.includes("complete") ||
      text.includes("waived")
    );
  });

  if (artifactButtons.length === 0) {
    throw new Error("No artifact buttons found. Did the template render?");
  }

  return artifactButtons[0];
}

export async function createProject(user, name = "Test Project") {
  await user.click(screen.getByRole("button", { name: /new project/i }));
  const nameInput = await screen.findByLabelText(/project name/i);
  await user.clear(nameInput);
  await user.type(nameInput, name);
  await user.click(screen.getByRole("button", { name: /^next$/i }));
  await user.click(screen.getByRole("button", { name: /team governance/i }));
  expect(await screen.findByRole("button", { name: new RegExp(name, "i") })).toBeInTheDocument();
}

export async function openArtifact(user, name) {
  await user.click(findArtifactListButtonByName(name));
  await waitFor(() => {
    const btn = findArtifactListButtonByName(name);
    expect(btn.className).toMatch(/activeArtifact/i);
  });
}

export async function switchToDirectMode(user) {
  const buttons = screen.getAllByRole("button", { name: /direct mode/i });
  await user.click(buttons[0]);
}

export async function applyWaiver(
  user,
  rationale = "Waived for this run with justification."
) {
  const waiverToggles = screen.getAllByLabelText(/waive this artifact/i);
  await user.click(waiverToggles[0]);
  expect(waiverToggles[0]).toBeChecked();
  const rationaleBox = screen.getAllByLabelText(/waiver rationale/i)[0];
  await user.clear(rationaleBox);
  await user.type(rationaleBox, rationale);
  expect(String(rationaleBox.value || "")).toMatch(/justified|waived/i);
  await user.click(screen.getAllByRole("button", { name: /apply waiver/i })[0]);

  await waitFor(() => {
    const active = findActiveArtifactListButton();
    expect((active.textContent || "").toLowerCase()).toContain("waived");
  });
}

