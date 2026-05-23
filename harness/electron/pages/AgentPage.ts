import { Locator, Page } from "@playwright/test";

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "complete";
}

/**
 * Page object for Cursor's Agent mode execution layer.
 *
 * In Cursor 3.x the "Agent" panel is the same right-side chat panel as the
 * Composer. Agent mode is one of five modes selectable via the mode dropdown
 * (∞ Agent ∨). Tool calls appear as collapsible entries inside the message
 * stream when the agent executes actions.
 *
 * See docs/cursor-ui-observations.md §3–4 for selector rationale.
 * TODO(stage-3): verify tool-call DOM structure via live Playwright CDP session.
 */
export class AgentPage {
  /** The mode selector button (shows "Agent", "Plan", "Debug", etc.). */
  private readonly modeSelector: Locator;
  /** Container that holds all tool-call entries in the message stream. */
  private readonly toolCallList: Locator;
  /** Approve button for the currently pending tool call. */
  private readonly approveButton: Locator;
  /** Reject button for the currently pending tool call. */
  private readonly rejectButton: Locator;

  constructor(private readonly page: Page) {
    this.modeSelector = page
      .locator('button', { hasText: /^(Agent|Plan|Debug|Multitask|Ask)$/ })
      .first();

    // TODO(stage-3): confirm the exact selector for tool-call entries.
    this.toolCallList = page.locator(
      '[data-type="tool_call"], .tool-call, [data-testid="tool-call"]',
    );

    this.approveButton = page
      .locator('[aria-label="Approve"], [aria-label*="approve"]')
      .or(page.locator('button', { hasText: /^(Approve|Allow|Run)$/ }))
      .first();

    this.rejectButton = page
      .locator('[aria-label="Reject"], [aria-label*="reject"]')
      .or(page.locator('button', { hasText: /^(Reject|Deny|Cancel)$/ }))
      .first();
  }

  /**
   * Activate Agent mode via the mode selector dropdown.
   * No-op if Agent mode is already selected.
   */
  async activate(): Promise<void> {
    const currentMode = await this.modeSelector.textContent();
    if (currentMode?.toLowerCase().includes("agent")) return;

    await this.modeSelector.click();
    // After dropdown opens, click the "Agent" option.
    await this.page
      .locator('[role="option"], [role="menuitem"]', { hasText: "Agent" })
      .first()
      .click();
  }

  /**
   * Return all observed tool calls in the current agent session.
   * Reads name and status from DOM attributes; args extraction needs CDP.
   * TODO(stage-3): implement args extraction via page.evaluate().
   */
  async getToolCalls(): Promise<ToolCall[]> {
    const items = await this.toolCallList.all();
    return Promise.all(
      items.map(async (item) => {
        const name =
          (await item.getAttribute("data-tool-name")) ??
          (await item.locator(".tool-call-name, [data-testid='tool-name']").textContent()) ??
          "unknown";
        const statusAttr = await item.getAttribute("data-status");
        const status = (statusAttr as ToolCall["status"] | null) ?? "complete";
        return { name: name.trim(), args: {}, status };
      }),
    );
  }

  /**
   * Switch to the Plan tab inside the agent panel and return its text.
   * In Cursor 3.x this is the "Plan" mode, accessed via the mode dropdown.
   * TODO(stage-3): confirm whether Plan mode has a dedicated tab or is a full
   *   mode switch.
   */
  async getPlanText(): Promise<string> {
    await this.modeSelector.click();
    await this.page
      .locator('[role="option"], [role="menuitem"]', { hasText: "Plan" })
      .first()
      .click();
    // Wait for plan content to render.
    const planContent = this.page
      .locator('[data-mode="plan"] .plan-content, .plan-view, [data-testid="plan-output"]')
      .first();
    await planContent.waitFor({ state: "visible", timeout: 10_000 }).catch(() => {});
    return planContent.textContent().then((t) => t ?? "");
  }

  /** Assert that a tool call with the given name is present in the list. */
  async assertToolCallPresent(toolName: string): Promise<void> {
    await this.toolCallList
      .filter({ hasText: toolName })
      .waitFor({ state: "visible", timeout: 30_000 });
  }

  /** Approve the currently pending tool call. */
  async approvePendingToolCall(): Promise<void> {
    await this.approveButton.click();
  }

  /** Reject the currently pending tool call. */
  async rejectPendingToolCall(): Promise<void> {
    await this.rejectButton.click();
  }
}
