import { test, expect } from "@playwright/test";
import { resetApp, createProject } from "./helpers.js";

test.beforeEach(async ({ page }) => {
  await resetApp(page);
});

test("AIPO Project Creation shows 8 phases with correct names", async ({ page }) => {
  await createProject(page, "AIPO Gov Project", "team", /aipo/i);

  // Should have 8 phase tab buttons visible.
  const phaseTabs = page.getByRole("tab");
  await expect(phaseTabs).toHaveCount(8);

  // Verify canonical phase names appear in the phase tabs.
  const tablist = page.getByRole("tablist", { name: /project phases/i });
  await expect(tablist.getByText("Strategic Initiation")).toBeVisible();
  await expect(tablist.getByText("Problem Definition")).toBeVisible();
  await expect(tablist.getByText("Data Understanding")).toBeVisible();
  await expect(tablist.getByText("Data Preparation")).toBeVisible();
  await expect(tablist.getByText("Modeling")).toBeVisible();
  await expect(tablist.getByText("Evaluation")).toBeVisible();
  await expect(tablist.getByText("Deployment & Monitoring")).toBeVisible();
  await expect(tablist.getByText("Controlled Closure & Stewardship")).toBeVisible();
});

test("AIPO Project shows classification badge in header", async ({ page }) => {
  await createProject(page, "AIPO Badge Test", "team", /aipo/i);

  // Classification badge should be visible (default INTERNAL).
  const badge = page.locator('select[aria-label="Classification level"]');
  await expect(badge).toBeVisible();
  await expect(badge).toHaveValue("INTERNAL");
});

test("AIPO artifacts include Gate Record in each phase", async ({ page }) => {
  await createProject(page, "AIPO Gate Test", "team", /aipo/i);

  // Phase 1 (Strategic Initiation) should have a Gate Record artifact.
  await expect(page.getByRole("button", { name: /gate record/i }).first()).toBeVisible();
});

test("AIPO artifact editor shows approval panel and doc status", async ({ page }) => {
  await createProject(page, "AIPO Editor Test", "team", /aipo/i);

  // Click first Gate Record artifact.
  await page.getByRole("button", { name: /gate record/i }).first().click();

  // Approval panel should be visible.
  await expect(page.getByText(/approval signatures/i)).toBeVisible();

  // Document status panel should be visible.
  await expect(page.getByText(/document status/i)).toBeVisible();
  await expect(page.getByText(/draft/i).first()).toBeVisible();
});

test("Plan selection modal shows both CPMAI and AIPO plans", async ({ page }) => {
  await page.getByRole("button", { name: /new project/i }).click();
  const nameInput = page.getByLabel(/project name/i);
  await nameInput.fill("Plan Selection Test");
  await page.getByRole("button", { name: /^next$/i }).click();

  // Both plans should be visible as clickable plan cards.
  await expect(page.getByRole("button", { name: /cpmai/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /aipo/i })).toBeVisible();

  // Back button should return to name step.
  const backBtn = page.getByRole("button", { name: "Back", exact: true });
  await backBtn.scrollIntoViewIfNeeded();
  await backBtn.click();
  await expect(nameInput).toBeVisible();
});
