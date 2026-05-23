import { expect } from "@playwright/test";

import { test } from "../../harness/electron/fixtures/cursor-app.js";
import { ComposerPage } from "../../harness/electron/pages/ComposerPage.js";

test.skip("Composer: types text and sends a message", async ({ firstWindow }) => {
  const composer = new ComposerPage(firstWindow);
  await composer.type("Hello, Cursor!");
  await composer.send();
  await composer.waitForStreamComplete();
  const response = await composer.lastResponse();
  expect(response.length).toBeGreaterThan(0);
});

test.skip("Composer: attaches a file and reflects it as a chip", async ({ firstWindow }) => {
  const composer = new ComposerPage(firstWindow);
  await composer.attachFile("/tmp/sample.txt");
  // Stage 2: assert chip presence via ComposerPage.fileChips locator
});

test.skip("Composer: model selector changes the active model", async ({ firstWindow }) => {
  const composer = new ComposerPage(firstWindow);
  // Stage 2: interact with modelSelector, verify header updates
  expect(firstWindow).toBeDefined();
});
