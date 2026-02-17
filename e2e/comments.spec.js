import { test, expect } from "@playwright/test";
import { resetApp, createProject } from "./helpers.js";

test.beforeEach(async ({ page }) => {
  // Simulate LAN HTTP where crypto.randomUUID may be missing.
  await page.addInitScript(() => {
    try {
      Object.defineProperty(globalThis.crypto, "randomUUID", {
        value: undefined,
        configurable: true,
        writable: true,
      });
    } catch {
      try {
        globalThis.crypto.randomUUID = undefined;
      } catch {
        // ignore
      }
    }
  });

  await resetApp(page);
});

test("Adding A Comment Works", async ({ page }) => {
  await createProject(page, "Comment Project");

  // Open the first artifact (phase 1 core list should be present).
  await page.getByRole("button", { name: /problem definition document/i }).click();
  // Editor is open when mode toggle appears.
  await expect(page.getByRole("button", { name: /direct mode/i })).toBeVisible();

  // Add a comment.
  await page.getByLabel(/^comment$/i).fill("Hello from LAN");
  await page.getByRole("button", { name: /add comment/i }).click();

  await expect(page.getByText("Hello from LAN")).toBeVisible();
  await expect(page.getByText(/no comments yet/i)).not.toBeVisible();
});
