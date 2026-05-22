import { expect } from "@playwright/test";

import { test } from "../../harness/electron/fixtures/cursor-app.js";

test.skip("Electron: nodeIntegration is disabled in all renderer windows", async ({ cursorApp }) => {
  // Stage 2: evaluate `typeof require` in each renderer; 'undefined' confirms nodeIntegration off.
  const windows = cursorApp.electronApp.windows();
  for (const win of windows) {
    const requireType = await win.evaluate(() => typeof require);
    expect(
      requireType,
      `window ${win.url()} has nodeIntegration enabled (require is accessible)`
    ).toBe("undefined");
  }
});

test.skip("Electron: nodeIntegrationInWorker is disabled", async ({ cursorApp }) => {
  // Stage 2: spawn a Web Worker in a renderer window and assert it cannot access require.
  expect(cursorApp.pid).toBeGreaterThan(0);
});
