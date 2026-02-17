import { test, expect } from "@playwright/test";
import fs from "node:fs/promises";

import { resetApp, createProject } from "./helpers.js";

async function openShareModal(page) {
  // Open Share modal from the first project row.
  await page.getByRole("button", { name: /^share$/i }).first().click();
  await expect(page.getByRole("dialog", { name: /share project/i })).toBeVisible();
}

test("Share modal opens and closes via Close button and backdrop click", async ({ page }) => {
  await resetApp(page);
  await createProject(page, "Share Modal Project");
  await openShareModal(page);

  await page.getByRole("button", { name: /^close$/i }).click();
  await expect(page.getByRole("dialog", { name: /share project/i })).toBeHidden();

  // Backdrop click also closes.
  await openShareModal(page);
  const dialog = page.getByRole("dialog", { name: /share project/i });
  const backdrop = page
    .locator('[class*="modalBackdrop"]')
    .filter({ has: dialog });
  await backdrop.click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole("dialog", { name: /share project/i })).toBeHidden();
});

test("Copy JSON to clipboard shows success notice and copies a bundle", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async (text) => {
            window.__thingstead_copied = text;
          },
        },
        configurable: true,
      });
    } catch {
      // ignore
    }
  });

  await resetApp(page);
  await createProject(page, "Clipboard Share Project");
  await openShareModal(page);

  await page.getByRole("button", { name: /copy json to clipboard/i }).click();
  await expect(page.getByText(/copied to clipboard/i)).toBeVisible();

  const copied = await page.evaluate(() => window.__thingstead_copied || "");
  expect(typeof copied).toBe("string");
  const parsed = JSON.parse(copied);
  expect(parsed).toMatchObject({ schemaVersion: 1 });
  expect(parsed.project?.name).toBe("Clipboard Share Project");
});

test("Download JSON triggers a download with parseable export bundle", async ({ page }, testInfo) => {
  await resetApp(page);
  await createProject(page, "Download Share Project");
  await openShareModal(page);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /download json/i }).click();
  const download = await downloadPromise;

  expect(download.suggestedFilename()).toMatch(/^thingstead-project_.+_\d{4}-\d{2}-\d{2}\.json$/);

  const outPath = testInfo.outputPath(download.suggestedFilename());
  await download.saveAs(outPath);

  const fileText = await fs.readFile(outPath, "utf-8");
  const parsed = JSON.parse(fileText);
  expect(parsed).toMatchObject({ schemaVersion: 1 });
  expect(parsed.project?.name).toBe("Download Share Project");
});

test("Share via device calls Web Share when supported (stubbed)", async ({ page }) => {
  await page.addInitScript(() => {
    try {
      Object.defineProperty(globalThis, "isSecureContext", { value: true, configurable: true });
    } catch {
      // ignore
    }
    try {
      Object.defineProperty(navigator, "canShare", {
        value: (obj) => Boolean(obj && Array.isArray(obj.files) && obj.files.length > 0),
        configurable: true,
      });
      Object.defineProperty(navigator, "share", {
        value: async (payload) => {
          window.__thingstead_shared = payload;
        },
        configurable: true,
      });
    } catch {
      // ignore
    }
  });

  await resetApp(page);
  await createProject(page, "Web Share Project");
  await openShareModal(page);

  const shareBtn = page.getByRole("button", { name: /share via device/i });
  await expect(shareBtn).toBeEnabled();
  await shareBtn.click();

  await expect(page.getByText(/share sheet opened/i)).toBeVisible();
  const payload = await page.evaluate(() => window.__thingstead_shared || null);
  expect(payload).toBeTruthy();
  expect(Array.isArray(payload.files)).toBe(true);
  expect(payload.files.length).toBeGreaterThan(0);
});
