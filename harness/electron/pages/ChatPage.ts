import { Locator, Page } from "@playwright/test";

/** Page object for Cursor's Chat history panel. */
export class ChatPage {
  private readonly messageList: Locator;
  private readonly copySnippetButton: Locator;

  constructor(private readonly page: Page) {
    this.messageList = page.locator('[data-testid="chat-message"], .chat-message');
    this.copySnippetButton = page.locator('[aria-label="Copy code"], [data-testid="copy-snippet"]').first();
  }

  /** Scroll the chat history to the bottom. */
  async scrollToBottom(): Promise<void> {
    throw new Error("stub: Stage 2 fills in");
  }

  /** Return the text content of the message at the given zero-based index. */
  async getMessageByIndex(index: number): Promise<string> {
    throw new Error("stub: Stage 2 fills in");
  }

  /** Return the total number of messages currently visible. */
  async getMessageCount(): Promise<number> {
    throw new Error("stub: Stage 2 fills in");
  }

  /** Click the copy button on the first visible code snippet and return clipboard content. */
  async copyFirstSnippet(): Promise<string> {
    throw new Error("stub: Stage 2 fills in");
  }
}
