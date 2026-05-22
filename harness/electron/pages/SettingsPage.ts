import { Locator, Page } from "@playwright/test";

/**
 * Page object for Cursor's unified Settings panel.
 *
 * Opening path: click ⚙️ gear icon (top-right) or press ⌘⇧J. This opens a
 * "Cursor Settings" editor tab. The sidebar on the left of the settings tab
 * contains icon buttons that navigate between sections.
 *
 * Sidebar icon order (top→bottom, based on live inspection 2026-05-22):
 *   0: Account (A)
 *   1: General (⚙️)           ← nth(1)
 *   2: VS Code Settings       ← opens a second tab, not useful here
 *   -- separator --
 *   3: Agents                 ← nth(3) skipping separator
 *   4: Tab (autocomplete)
 *   5: Models
 *   6: Cloud Agents
 *   -- separator --
 *   7: Plugins
 *   8: Rules, Skills, Subagents
 *   9: Tools (MCP lives here) ← nth(9)
 *  10: Hooks
 *
 * TODO(stage-3): replace nth() with aria-label once selectors are verified.
 * See docs/cursor-ui-observations.md §6 for full sidebar mapping.
 */
export class SettingsPage {
  /** The gear icon button in the top-right toolbar. */
  private readonly gearButton: Locator;
  /** The sidebar nav buttons inside the settings panel. */
  private readonly sidebarButtons: Locator;

  constructor(private readonly page: Page) {
    this.gearButton = page
      .locator('[aria-label="Cursor Settings"], [title="Cursor Settings"]')
      .or(page.locator('button[aria-label*="settings"]').last());

    // All clickable icon-buttons in the settings sidebar.
    this.sidebarButtons = page.locator(
      '.settings-sidebar button, [data-testid="settings-nav"] button',
    );
  }

  /** Open Cursor Settings via the gear icon. */
  async open(): Promise<void> {
    await this.gearButton.click();
    // Wait for the settings tab to become active.
    await this.page
      .locator('.tab', { hasText: 'Cursor Settings' })
      .or(this.page.locator('[data-testid="settings-panel"]'))
      .waitFor({ state: "visible", timeout: 5_000 })
      .catch(() => {});
  }

  /** Navigate to the Privacy section (part of General). */
  async openPrivacyPanel(): Promise<Locator> {
    await this._clickSidebarIcon(1); // General section
    const panel = this.page.locator('text=Privacy').first();
    await panel.scrollIntoViewIfNeeded();
    return panel;
  }

  /** Navigate to the Models section. */
  async openModelsPanel(): Promise<Locator> {
    await this._clickSidebarIcon(5);
    const panel = this.page
      .locator('[placeholder="Add or search model"]')
      .or(this.page.locator('text=Models').first());
    await panel.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
    return panel;
  }

  /** Navigate to the Rules, Skills, Subagents section. */
  async openRulesPanel(): Promise<Locator> {
    await this._clickSidebarIcon(8);
    const panel = this.page.locator('text=Rules, Skills, Subagents').first();
    await panel.waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
    return panel;
  }

  /** Navigate to the General → Preferences section. */
  async openFeaturesPanel(): Promise<Locator> {
    await this._clickSidebarIcon(1);
    const panel = this.page.locator('text=Preferences').first();
    await panel.scrollIntoViewIfNeeded();
    return panel;
  }

  /** Navigate to the Tools section where MCP servers are configured. */
  async openMCPPanel(): Promise<void> {
    await this._clickSidebarIcon(9);
    // Wait for the "Installed MCP Servers" heading to appear.
    await this.page
      .locator('text=Installed MCP Servers')
      .waitFor({ state: "visible", timeout: 5_000 })
      .catch(() => {});
  }

  /**
   * Toggle a boolean setting by its visible label text.
   * The label is matched case-insensitively.
   */
  async toggle(labelText: string): Promise<void> {
    const row = this.page
      .locator('text=' + labelText)
      .first()
      .locator('../..');
    const switchEl = row
      .locator('[role="switch"]')
      .or(row.locator('button[aria-checked]'))
      .first();
    await switchEl.click();
  }

  /**
   * Set a text input setting by its visible label text.
   */
  async setInput(labelText: string, value: string): Promise<void> {
    const row = this.page.locator('text=' + labelText).first().locator('../..');
    const input = row.locator('input[type="text"], textarea').first();
    await input.fill(value);
  }

  /** Click the nth sidebar icon (0-based). Skips separators in the count. */
  private async _clickSidebarIcon(index: number): Promise<void> {
    await this.sidebarButtons.nth(index).click();
  }
}
