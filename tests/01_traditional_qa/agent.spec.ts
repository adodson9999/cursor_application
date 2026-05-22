import { expect } from "@playwright/test";

import { test } from "../../harness/electron/fixtures/cursor-app.js";
import { AgentPage } from "../../harness/electron/pages/AgentPage.js";

test.skip("Agent: activates and shows plan tab", async ({ firstWindow }) => {
  const agent = new AgentPage(firstWindow);
  await agent.activate();
  const plan = await agent.getPlanText();
  expect(plan.length).toBeGreaterThanOrEqual(0);
});

test.skip("Agent: tool call appears in list after task submission", async ({ firstWindow }) => {
  const agent = new AgentPage(firstWindow);
  await agent.activate();
  // Stage 2: submit a task that triggers a known tool, assert tool call present
  const calls = await agent.getToolCalls();
  expect(calls).toBeDefined();
});

test.skip("Agent: approve and reject buttons respond to pending tool calls", async ({ firstWindow }) => {
  const agent = new AgentPage(firstWindow);
  await agent.activate();
  // Stage 2: trigger a tool call, approve it, assert status transitions to complete
  expect(firstWindow).toBeDefined();
});
