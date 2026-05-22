import { Locator, Page } from "@playwright/test";

export interface ToolCall {
  name: string;
  args: Record<string, unknown>;
  status: "pending" | "approved" | "rejected" | "complete";
}

/** Page object for Cursor's Agent mode (agentic task execution panel). */
export class AgentPage {
  private readonly agentToggle: Locator;
  private readonly toolCallList: Locator;
  private readonly planTab: Locator;
  private readonly approveButton: Locator;
  private readonly rejectButton: Locator;

  constructor(private readonly page: Page) {
    this.agentToggle = page.locator('[data-testid="agent-mode-toggle"], [aria-label="Enable agent mode"]').first();
    this.toolCallList = page.locator('[data-testid="tool-call-item"], .agent-tool-call');
    this.planTab = page.locator('[data-testid="plan-tab"], [aria-label="Plan"]').first();
    this.approveButton = page.locator('[data-testid="approve-tool-call"], [aria-label="Approve"]').first();
    this.rejectButton = page.locator('[data-testid="reject-tool-call"], [aria-label="Reject"]').first();
  }

  /** Activate agent mode via the toggle in the Composer panel. */
  async activate(): Promise<void> {
    throw new Error("stub: Stage 2 fills in");
  }

  /** Return all observed tool calls in the current agent session. */
  async getToolCalls(): Promise<ToolCall[]> {
    throw new Error("stub: Stage 2 fills in");
  }

  /** Switch to the Plan tab and return the rendered plan text. */
  async getPlanText(): Promise<string> {
    throw new Error("stub: Stage 2 fills in");
  }

  /** Assert that a tool call with the given name is present in the list. */
  async assertToolCallPresent(toolName: string): Promise<void> {
    throw new Error("stub: Stage 2 fills in");
  }

  /** Approve the currently pending tool call. */
  async approvePendingToolCall(): Promise<void> {
    throw new Error("stub: Stage 2 fills in");
  }

  /** Reject the currently pending tool call. */
  async rejectPendingToolCall(): Promise<void> {
    throw new Error("stub: Stage 2 fills in");
  }
}
