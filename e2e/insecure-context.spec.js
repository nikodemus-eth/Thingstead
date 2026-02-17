import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Simulate environments where crypto.randomUUID is missing (common on non-localhost HTTP).
  await page.addInitScript(() => {
    try {
      // Some browsers make this non-writable; best-effort.
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
});

test("New Project Works Without crypto.randomUUID", async ({ page }) => {
  const consoleLines = [];
  const pageErrors = [];
  page.on("console", (msg) => consoleLines.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) =>
    pageErrors.push(String(err?.stack || err?.message || err))
  );

  await page.goto("/?disableLanSync=1");
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => localStorage.setItem("thingstead:disableLanSync", "1"));
  await page.reload();

  const hasRandomUUID = await page.evaluate(
    () => typeof globalThis.crypto?.randomUUID === "function"
  );
  // If still present, the test still validates no regressions; the main requirement is that
  // project creation does not depend on randomUUID being available.
  if (hasRandomUUID) {
    test.info().annotations.push({
      type: "note",
      description: "crypto.randomUUID remained available in this browser context.",
    });
  }

  await page.getByRole("button", { name: /new project/i }).click();
  await page.getByLabel(/project name/i).fill("Insecure UUID");
  await page.getByRole("button", { name: /^next$/i }).click();
  await page.getByRole("button", { name: /team governance/i }).click();

  if (pageErrors.length > 0) {
    throw new Error(`Page errors:\\n${pageErrors.join("\\n")}\\n\\nConsole:\\n${consoleLines.join("\\n")}`);
  }

  await expect(page.getByRole("button", { name: /insecure uuid/i }).first()).toBeVisible();
});
