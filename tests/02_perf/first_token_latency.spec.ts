import { expect } from "@playwright/test";

import { test } from "../../harness/electron/fixtures/cursor-app.js";
import { ComposerPage } from "../../harness/electron/pages/ComposerPage.js";

/** Maximum acceptable time-to-first-token in milliseconds. */
const TTFT_BUDGET_MS = 3000;

test.skip("Perf: time-to-first-token on a trivial prompt is within budget", async ({ firstWindow }) => {
  const composer = new ComposerPage(firstWindow);

  const start = Date.now();
  await composer.type("Say the word OK and nothing else.");
  await composer.send();
  // Stage 2: intercept the first streamed token event rather than waiting for full stream.
  await composer.waitForStreamComplete();
  const elapsed = Date.now() - start;

  expect(elapsed).toBeLessThan(TTFT_BUDGET_MS);
});
