import { expect } from "@playwright/test";

import { test } from "../../harness/electron/fixtures/cursor-app.js";
import { MCPPage } from "../../harness/electron/pages/MCPPage.js";
import { SettingsPage } from "../../harness/electron/pages/SettingsPage.js";

test.skip("MCP: install a server and verify it appears in the list", async ({ firstWindow }) => {
  const settings = new SettingsPage(firstWindow);
  await settings.openMCPPanel();
  const mcp = new MCPPage(firstWindow);

  const serverConfig = JSON.stringify({
    command: "node",
    args: ["/tmp/fake-mcp-server.js"],
  });
  await mcp.addServer(serverConfig);

  const names = await mcp.listServerNames();
  // Stage 2: assert the new server name is present in names
  expect(Array.isArray(names)).toBe(true);
});

test.skip("MCP: listed server count matches .cursor/mcp.json entries", async ({ firstWindow }) => {
  const settings = new SettingsPage(firstWindow);
  await settings.openMCPPanel();
  const mcp = new MCPPage(firstWindow);
  const names = await mcp.listServerNames();
  // Stage 2: read .cursor/mcp.json and compare keys count to names.length
  expect(names.length).toBeGreaterThanOrEqual(0);
});
