import { expect } from "@playwright/test";

import { test } from "../../harness/electron/fixtures/cursor-app.js";
import { ChatPage } from "../../harness/electron/pages/ChatPage.js";

test.skip("Chat: message count increases after sending", async ({ firstWindow }) => {
  const chat = new ChatPage(firstWindow);
  const before = await chat.getMessageCount();
  // Stage 2: send a message via ComposerPage, then re-count
  const after = await chat.getMessageCount();
  expect(after).toBeGreaterThanOrEqual(before);
});

test.skip("Chat: scrolls to bottom on new message", async ({ firstWindow }) => {
  const chat = new ChatPage(firstWindow);
  await chat.scrollToBottom();
  // Stage 2: assert scroll position is at the end of the container
  expect(firstWindow).toBeDefined();
});

test.skip("Chat: copy snippet button places code on clipboard", async ({ firstWindow }) => {
  const chat = new ChatPage(firstWindow);
  // Stage 2: seed a code-block response, copy it, verify clipboard
  const snippet = await chat.copyFirstSnippet();
  expect(snippet.length).toBeGreaterThanOrEqual(0);
});
