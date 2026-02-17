import { test, expect } from "@playwright/test";
import { resetApp, createProject } from "./helpers.js";

test.beforeEach(async ({ page }) => {
  await resetApp(page);
});

test("Project Creation Smoke", async ({ page }) => {
  await createProject(page, "E2E Project A");
  await expect(page.getByText(/gate locked/i)).toBeVisible();
});

test("Dashboard Renders", async ({ page }) => {
  await createProject(page, "E2E Project B");
  await page.getByRole("button", { name: /^dashboard$/i }).click();
  await expect(
    page.getByRole("button", { name: /add\/remove widgets/i })
  ).toBeVisible();
  await expect(page.getByText("Project Summary")).toBeVisible();
});

test.describe("Mobile Smoke", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("Loads And Opens New Project Modal", async ({ page }) => {
    await page.getByRole("button", { name: /new project/i }).click();
    await expect(page.getByLabel(/project name/i)).toBeVisible();
  });
});
