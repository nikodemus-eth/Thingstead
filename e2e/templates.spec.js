import { test, expect } from "@playwright/test";
import { resetApp, createProject } from "./helpers.js";

async function fillTemplateField(page, labelText, value) {
  const label = page.locator("label", { hasText: labelText }).first();
  const fieldWrap = label.locator(".."); // label -> templateField div
  const textbox = fieldWrap.locator("textarea, input").first();
  await expect(textbox).toBeVisible();
  await textbox.fill(value);
}

test.beforeEach(async ({ page }) => {
  await resetApp(page);
});

test("Template required fields block completion until satisfied", async ({ page }) => {
  await createProject(page, "Template Required Fields");

  await page.getByRole("button", { name: /problem definition document/i }).click();
  await expect(page.getByText(/problem definition document template/i)).toBeVisible();

  // Switch to Direct Mode to fill all fields quickly.
  await page.getByRole("button", { name: /direct mode/i }).click();

  const artifactButton = page.getByRole("button", { name: /problem definition document/i }).first();
  await expect(artifactButton).toBeVisible();
  await expect(artifactButton).not.toContainText(/complete/i);

  await fillTemplateField(
    page,
    "Business Problem Statement",
    "This statement is intentionally long enough to satisfy the minimum length validation for required fields."
  );
  await fillTemplateField(
    page,
    "Current Non-AI Approach",
    "A sufficiently detailed description of the current heuristic baseline to satisfy the required field validation."
  );
  await fillTemplateField(
    page,
    "Justification for AI Over Non-Cognitive Solution",
    "A sufficiently detailed justification explaining why a cognitive approach is required, long enough to satisfy validation."
  );

  // Required selection fields.
  await page.locator("label", { hasText: "AI Pattern Classification" }).locator("..").locator("select").selectOption({ index: 1 });
  await page.locator("label", { hasText: "Problem Scope" }).locator("..").locator("select").selectOption({ index: 1 });
  await page.locator("label", { hasText: "DIKUW Target Level" }).locator("..").locator("select").selectOption({ index: 1 });

  // Required table field: add a row and fill all columns.
  const tableWrap = page.locator("label", { hasText: "Cognitive Objectives" }).locator("..");
  await tableWrap.getByRole("button", { name: /add row/i }).click();
  const firstRowInputs = tableWrap.locator("tbody tr").first().locator("input");
  await firstRowInputs.nth(0).fill("Classify tickets by intent");
  await firstRowInputs.nth(1).fill("85% accuracy");
  await firstRowInputs.nth(2).fill("Manual at 60%");
  await firstRowInputs.nth(3).fill("75% accuracy");

  // Completion is computed; it should now render as complete in the artifact list.
  await expect(artifactButton).toContainText(/complete/i);
});
