import { test as base, Page } from "@playwright/test";

import { CursorApp, launchCursor, teardownCursor } from "../launch.js";

interface CursorFixtures {
  cursorApp: CursorApp;
  firstWindow: Page;
}

/** Playwright fixture that provides a fresh Cursor instance per test. */
export const test = base.extend<CursorFixtures>({
  cursorApp: async ({}, use) => {
    const app = await launchCursor();
    await use(app);
    await teardownCursor(app);
  },

  firstWindow: async ({ cursorApp }, use) => {
    await use(cursorApp.firstWindow);
  },
});

export { expect } from "@playwright/test";
