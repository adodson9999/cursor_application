import { Locator, Page } from "@playwright/test";

/** Page object for the Cursor Composer (AI chat input panel). */
export class ComposerPage {
  private readonly input: Locator;
  private readonly sendButton: Locator;
  private readonly fileChips: Locator;
  private readonly modelSelector: Locator;
  private readonly responseStream: Locator;

  constructor(private readonly page: Page) {
    this.input = page.locator('[aria-label="Chat Input"], .composer-input textarea').first();
    this.sendButton = page.locator('[aria-label="Send message"], button[data-testid="send-button"]').first();
    this.fileChips = page.locator('.composer-attached-file, [data-testid="file-chip"]');
    this.modelSelector = page.locator('[data-testid="model-selector"], .model-picker-trigger').first();
    this.responseStream = page.locator('.chat-message-assistant, [data-testid="assistant-message"]').last();
  }

  /** Type text into the Composer input field. */
  async type(text: string): Promise<void> {
    throw new Error("stub: Stage 2 fills in");
  }

  /** Attach a file to the current Composer session via the file picker. */
  async attachFile(filePath: string): Promise<void> {
    throw new Error("stub: Stage 2 fills in");
  }

  /** Submit the current Composer message by clicking the send button. */
  async send(): Promise<void> {
    throw new Error("stub: Stage 2 fills in");
  }

  /** Return the text content of the most recent assistant response. */
  async lastResponse(): Promise<string> {
    throw new Error("stub: Stage 2 fills in");
  }

  /** Wait until the streaming response indicator disappears. */
  async waitForStreamComplete(): Promise<void> {
    throw new Error("stub: Stage 2 fills in");
  }
}
