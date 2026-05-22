import { expect } from "@playwright/test";

import { test } from "../../harness/electron/fixtures/cursor-app.js";
import { AgentPage } from "../../harness/electron/pages/AgentPage.js";
import { ComposerPage } from "../../harness/electron/pages/ComposerPage.js";
import { MCPPage } from "../../harness/electron/pages/MCPPage.js";
import { SettingsPage } from "../../harness/electron/pages/SettingsPage.js";

test.skip("MCP: agent invokes an installed server tool in response to a prompt", async ({ firstWindow }) => {
  const settings = new SettingsPage(firstWindow);
  await settings.openMCPPanel();
  const mcp = new MCPPage(firstWindow);

  // Stage 2: install a known local MCP stub from malicious_mcp/ or a test fixture server.
  const tools = await mcp.listServerTools("test-server");
  expect(Array.isArray(tools)).toBe(true);
});

test.skip("MCP: tool invocation result is surfaced in the Composer response", async ({ firstWindow }) => {
  const agent = new AgentPage(firstWindow);
  await agent.activate();

  const composer = new ComposerPage(firstWindow);
  // Stage 2: prompt agent to call a specific MCP tool, assert tool call in AgentPage list
  await composer.type("Use the test-server echo tool to say hello.");
  await composer.send();
  await composer.waitForStreamComplete();

  const calls = await agent.getToolCalls();
  expect(calls.length).toBeGreaterThanOrEqual(0);
});
