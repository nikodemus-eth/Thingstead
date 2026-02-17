import { expect } from "@playwright/test";

export async function resetApp(page) {
  await page.goto("/?disableLanSync=1");
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => localStorage.setItem("thingstead:disableLanSync", "1"));
  await page.reload();
  await expect(page.getByText("Thingstead")).toBeVisible();
}

export async function openNewProjectModal(page) {
  const nameInput = page.getByLabel(/project name/i);
  if (!(await nameInput.isVisible().catch(() => false))) {
    await page.getByRole("button", { name: /new project/i }).click();
  }
  await expect(nameInput).toBeVisible();
  return nameInput;
}

export async function createProject(page, name = "E2E Project", governance = "team") {
  const nameInput = await openNewProjectModal(page);
  await nameInput.fill(name);
  await page.getByRole("button", { name: /^next$/i }).click();
  await page.getByRole("button", { name: new RegExp(`${governance}\\s+governance`, "i") }).click();
  // Avoid strict-mode violations if multiple projects share the same name, and ensure the
  // project is actually selected before proceeding.
  await expect(page.getByRole("button", { name }).first()).toBeVisible();
  await page.getByRole("button", { name }).first().click();
  await expect(page.getByText(/PHASE 1 GATE:/i)).toBeVisible();
}
