import { expect } from "@playwright/test";

import { test } from "../../harness/electron/fixtures/cursor-app.js";
import { MCPPage } from "../../harness/electron/pages/MCPPage.js";
import { SettingsPage } from "../../harness/electron/pages/SettingsPage.js";

test.skip("MCP: lists installed servers in the settings panel", async ({ firstWindow }) => {
  const settings = new SettingsPage(firstWindow);
  await settings.openMCPPanel();
  const mcp = new MCPPage(firstWindow);
  const names = await mcp.listServerNames();
  expect(Array.isArray(names)).toBe(true);
});

test.skip("MCP: add a server and verify it appears in the list", async ({ firstWindow }) => {
  const settings = new SettingsPage(firstWindow);
  await settings.openMCPPanel();
  const mcp = new MCPPage(firstWindow);
  const config = JSON.stringify({ command: "echo", args: ["test-server"] });
  await mcp.addServer(config);
  // Stage 2: assert new server name in listServerNames()
  expect(firstWindow).toBeDefined();
});

test.skip("MCP: remove a server and verify it is gone", async ({ firstWindow }) => {
  const settings = new SettingsPage(firstWindow);
  await settings.openMCPPanel();
  const mcp = new MCPPage(firstWindow);
  // Stage 2: add then remove, assert absent
  const names = await mcp.listServerNames();
  expect(names).toBeDefined();
});
