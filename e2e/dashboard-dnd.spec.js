import { test, expect } from "@playwright/test";
import { resetApp, createProject } from "./helpers.js";

test.beforeEach(async ({ page }) => {
  await resetApp(page);
});

test("Dashboard widgets can be dragged and persist layout", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === "webkit-mobile",
    "Touch-drag is flaky in emulation; covered by desktop WebKit/Chromium/Firefox."
  );

  await createProject(page, "DND Project");
  await page.getByRole("button", { name: /^dashboard$/i }).click();
  await expect(page.getByText("Project Summary")).toBeVisible();

  const card = page.locator('[data-widget-id="ProjectSummary"]').first();
  const handle = page.locator('[data-widget-handle="ProjectSummary"]').first();

  const before = await card.boundingBox();
  expect(before).toBeTruthy();

  // Drag far enough to cause a snap to a new grid position.
  const h = await handle.boundingBox();
  expect(h).toBeTruthy();
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(h.x + h.width / 2 + 520, h.y + h.height / 2 + 160, {
    steps: 12,
  });
  await page.mouse.up();

  await page.waitForTimeout(150);

  const after = await card.boundingBox();
  expect(after).toBeTruthy();
  expect(Math.abs(after.x - before.x) + Math.abs(after.y - before.y)).toBeGreaterThan(20);

  const settings = await page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem("cpmai-settings") || "null");
    } catch {
      return null;
    }
  });
  expect(settings).toBeTruthy();
  const layout = settings?.dashboard?.layout || [];
  const ps = layout.find((it) => it.i === "ProjectSummary");
  expect(ps).toBeTruthy();
  // Default is x=0,y=0; any move should update at least one coordinate.
  expect(ps.x !== 0 || ps.y !== 0).toBeTruthy();
});
