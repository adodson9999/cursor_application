import { Locator, Page } from "@playwright/test";

/**
 * Page object for Cursor's Chat history (message list within the Agent panel).
 *
 * In Cursor 3.x all messages live in the same right-side panel. "Chat" history
 * is the scrollable message stream above the input.
 * TODO(stage-3): verify data-role vs data-type attribute names via CDP.
 */
export class ChatPage {
  /** All message blocks (both human and assistant). */
  private readonly messageList: Locator;
  /** All assistant (AI) message blocks. */
  private readonly assistantMessages: Locator;
  /** The scrollable message container. */
  private readonly scrollContainer: Locator;
  /** Copy-code button inside a code block. */
  private readonly copyCodeButton: Locator;

  constructor(private readonly page: Page) {
    this.messageList = page.locator(
      '[data-role="user"], [data-role="assistant"], .human-message, .assistant-message',
    );

    this.assistantMessages = page.locator(
      '[data-role="assistant"], .assistant-message, [data-type="ai"]',
    );

    // The scrollable chat viewport — Cursor typically wraps messages in a
    // flex-column container with overflow-y: auto.
    this.scrollContainer = page
      .locator('.chat-messages, .conversation-container, [data-testid="message-list"]')
      .first();

    this.copyCodeButton = page
      .locator('[aria-label*="Copy"], [aria-label*="copy code"]')
      .or(page.locator('button[title*="Copy"]'))
      .first();
  }

  /** Scroll the chat message area to the bottom. */
  async scrollToBottom(): Promise<void> {
    await this.scrollContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
  }

  /** Return the text content of the message at the given zero-based index. */
  async getMessageByIndex(index: number): Promise<string> {
    const item = this.messageList.nth(index);
    await item.waitFor({ state: "visible" });
    return item.innerText();
  }

  /** Return the total number of messages currently visible in the panel. */
  async getMessageCount(): Promise<number> {
    return this.messageList.count();
  }

  /**
   * Click the copy button on the first visible code snippet and return the
   * clipboard text.
   * Requires the page context to have clipboard access granted.
   */
  async copyFirstSnippet(): Promise<string> {
    // Hover over the first code block to reveal the copy button.
    const firstCodeBlock = this.page
      .locator('pre code, .code-block, [data-type="code"]')
      .first();
    await firstCodeBlock.hover();
    await this.copyCodeButton.click();

    // Read clipboard via the evaluate bridge (works in Electron context).
    const text = await this.page.evaluate(async () => {
      return navigator.clipboard.readText();
    });
    return text;
  }
}
