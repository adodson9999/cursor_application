import { expect } from "@playwright/test";

import { test } from "../../harness/electron/fixtures/cursor-app.js";
import { SettingsPage } from "../../harness/electron/pages/SettingsPage.js";

test.skip("Settings: opens and shows Privacy panel", async ({ firstWindow }) => {
  const settings = new SettingsPage(firstWindow);
  await settings.open();
  const panel = await settings.openPrivacyPanel();
  expect(panel).toBeDefined();
});

test.skip("Settings: toggles a boolean setting without error", async ({ firstWindow }) => {
  const settings = new SettingsPage(firstWindow);
  await settings.open();
  await settings.openFeaturesPanel();
  // Stage 2: toggle a known boolean, assert its inverse state
  expect(firstWindow).toBeDefined();
});

test.skip("Settings: Rules panel accepts and persists a rules file path", async ({ firstWindow }) => {
  const settings = new SettingsPage(firstWindow);
  await settings.open();
  await settings.openRulesPanel();
  await settings.setInput("Rules file", "/tmp/test-rules.md");
  // Stage 2: assert the input reflects the new value
  expect(firstWindow).toBeDefined();
});
