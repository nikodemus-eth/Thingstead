import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { resetApp, createProject } from "./helpers.js";

function artifactPath(testInfo, filename) {
  const outDir = path.join(process.cwd(), "playwright-artifacts", testInfo.project.name);
  fs.mkdirSync(outDir, { recursive: true });
  return path.join(outDir, filename);
}

test.beforeEach(async ({ page }) => {
  await resetApp(page);
});

test("Project List + Modal Styling", async ({ page }, testInfo) => {
  // Baseline sidebar UI screenshot (icons, buttons, typography).
  await page.screenshot({ path: artifactPath(testInfo, "sidebar-initial.png") });

  // Open "New Project" modal and validate that custom styles are applied (not default WebKit controls).
  await page.getByRole("button", { name: /new project/i }).click();

  const createInput = page.getByLabel(/project name/i);
  await expect(createInput).toBeVisible();
  await createInput.fill("Theme Check");

  // Check for non-default styling signals.
  const nextButton = page.getByRole("button", { name: /^next$/i });
  await expect(nextButton).toBeEnabled();
  const nextAppearance = await nextButton.evaluate((el) => getComputedStyle(el).appearance);
  const nextBgImage = await nextButton.evaluate((el) => getComputedStyle(el).backgroundImage);
  const nextBorderRadius = await nextButton.evaluate((el) => getComputedStyle(el).borderRadius);
  // Nordic Minimal: flat fills only (no gradients), and themed accent background.
  expect(nextAppearance).not.toBe("auto");
  expect(nextBgImage).not.toMatch(/gradient/i);
  expect(parseFloat(nextBorderRadius)).toBeGreaterThan(4);

  await page.screenshot({ path: artifactPath(testInfo, "create-modal.png") });

  // Create a project and verify icons still render (SVGs exist and have non-zero size).
  await createProject(page, "Safari Check");

  // Capture the sidebar in a non-empty state (this is where Safari regressions have been reported).
  const sidebar = page.locator("aside");
  await expect(sidebar).toBeVisible();
  await sidebar.screenshot({ path: artifactPath(testInfo, "sidebar-with-project.png") });

  const projectHeaderIcon = page.locator('[aria-hidden="true"] svg').first();
  const box = await projectHeaderIcon.boundingBox();
  expect(box).toBeTruthy();
  expect(box.width).toBeGreaterThan(8);
  expect(box.height).toBeGreaterThan(8);

  await page.screenshot({ path: artifactPath(testInfo, "project-created.png") });

  // Regression guard: stroke-only icons should not render as filled "blobs" in WebKit/Safari.
  // Check fill on the "project" glyph's first rect inside the sidebar project button.
  const projectButton = page.getByRole("button", { name: /safari check/i });
  const projectIconFirstRect = projectButton.locator("svg rect").first();
  const computedFill = await projectIconFirstRect.evaluate((el) => getComputedStyle(el).fill);
  expect(["none", "rgba(0, 0, 0, 0)", "transparent"]).toContain(computedFill);
});
