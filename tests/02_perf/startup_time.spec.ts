import { expect } from "@playwright/test";

import { test } from "../../harness/electron/fixtures/cursor-app.js";

/** Maximum acceptable cold-start time in milliseconds. */
const STARTUP_BUDGET_MS = 8000;

test.skip("Perf: cold startup completes within budget", async ({ cursorApp }) => {
  // cursorApp fixture records launch; Stage 2 wires a timestamp diff here.
  // The fixture itself measures launch-to-firstWindow time.
  expect(cursorApp.pid).toBeGreaterThan(0);
  // Stage 2: assert elapsed < STARTUP_BUDGET_MS using fixture timestamps
  expect(STARTUP_BUDGET_MS).toBeGreaterThan(0);
});
