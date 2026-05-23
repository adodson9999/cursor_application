import { expect } from "@playwright/test";

import { test } from "../../harness/electron/fixtures/cursor-app.js";

test.skip("Electron: contextIsolation is enabled in all renderer windows", async ({ cursorApp }) => {
  // Stage 2: enumerate all windows via cursorApp.electronApp.windows(),
  // evaluate `window.contextIsolated` in each renderer via page.evaluate().
  const windows = cursorApp.electronApp.windows();
  for (const win of windows) {
    const isolated = await win.evaluate(() =>
      (window as unknown as Record<string, unknown>)["contextIsolated"]
    );
    expect(isolated, `window ${win.url()} has contextIsolation disabled`).toBe(true);
  }
});
