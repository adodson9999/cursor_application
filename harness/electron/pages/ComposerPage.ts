import { Locator, Page } from "@playwright/test";

/**
 * Page object for the Cursor Agent / Composer panel (right-side chat panel).
 *
 * Selector rationale: derived from live visual inspection of Cursor 3.x on
 * 2026-05-22. Prefer aria-label and placeholder over CSS classes (obfuscated
 * in Electron production builds). See docs/cursor-ui-observations.md §4.
 *
 * TODO(stage-3): verify all selectors against Cursor DOM via Playwright CDP.
 */
export class ComposerPage {
  /** The main chat textarea. Placeholder text is stable across versions. */
  private readonly input: Locator;
  /** Mode selector button: shows current mode (Agent / Plan / Debug / etc.). */
  private readonly modeSelector: Locator;
  /** Stop generation button — only present during active streaming. */
  private readonly stopButton: Locator;
  /** File-attach (paperclip) button. */
  private readonly attachButton: Locator;
  /** Last assistant message block. */
  private readonly lastAssistantMessage: Locator;
  /** Streaming activity indicator — disappears when generation is complete. */
  private readonly streamingIndicator: Locator;

  constructor(private readonly page: Page) {
    this.input = page
      .locator('[placeholder="Plan, Build, / for commands, @ for context"]')
      .or(page.locator('[role="textbox"][aria-multiline="true"]').last())
      .or(page.locator('.chat-input [contenteditable="true"]'));

    this.modeSelector = page
      .locator('button', { hasText: /^(Agent|Plan|Debug|Multitask|Ask)$/ })
      .first();

    this.stopButton = page
      .locator('[aria-label="Stop"], [aria-label*="stop generation"]')
      .or(page.locator('button[title*="Stop"]'));

    this.attachButton = page
      .locator('[aria-label="Attach"], [aria-label*="attach"], [aria-label*="Add file"]')
      .or(page.locator('button[title*="ttach"]'));

    // TODO(stage-3): verify .assistant-message vs data-role="assistant"
    this.lastAssistantMessage = page
      .locator('[data-role="assistant"], .assistant-message, [data-type="ai"]')
      .last();

    this.streamingIndicator = page
      .locator('[data-streaming="true"], .streaming-indicator, .loading-dots')
      .first();
  }

  /** Type text into the Composer input field. */
  async type(text: string): Promise<void> {
    await this.input.click();
    await this.input.fill(text);
  }

  /**
   * Attach a file to the current Composer session.
   * Opens the system file picker — Stage 3 will wire the actual file chooser.
   * TODO(stage-3): use page.waitForEvent('filechooser') pattern.
   */
  async attachFile(filePath: string): Promise<void> {
    const [fileChooser] = await Promise.all([
      this.page.waitForEvent("filechooser"),
      this.attachButton.click(),
    ]);
    await fileChooser.setFiles(filePath);
  }

  /** Submit the current message by clicking the send button or pressing Enter. */
  async send(): Promise<void> {
    // Cursor submits on Enter; ⌘+Enter is optional (controlled by a setting).
    // Click inside the input first to ensure focus, then trigger submission.
    await this.input.click();
    // TODO(stage-3): confirm whether Enter or a dedicated send button is canonical.
    const sendButton = this.page
      .locator('[aria-label="Send"], [aria-label*="send message"], button[type="submit"]')
      .or(this.page.locator('button[title*="Send"]'))
      .first();
    await sendButton.click();
  }

  /** Return the text content of the most recent assistant response. */
  async lastResponse(): Promise<string> {
    await this.lastAssistantMessage.waitFor({ state: "visible" });
    return this.lastAssistantMessage.innerText();
  }

  /**
   * Wait until the streaming response has completed.
   * Strategy: wait for the stop button to disappear (it only exists during streaming).
   */
  async waitForStreamComplete(): Promise<void> {
    // First wait for the stop button to appear (stream started).
    try {
      await this.stopButton.waitFor({ state: "visible", timeout: 10_000 });
    } catch {
      // Stop button may never appear for very fast completions — that's fine.
    }
    // Then wait for it to disappear (stream ended).
    await this.stopButton.waitFor({ state: "hidden", timeout: 120_000 });
  }
}
