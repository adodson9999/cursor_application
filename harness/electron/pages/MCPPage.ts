import { Locator, Page } from "@playwright/test";

export type ServerAuthState = "authorized" | "unauthorized" | "pending" | "error";

/**
 * Page object for Cursor's MCP server management UI.
 *
 * Access path: ⚙️ Settings → Tools section (pencil icon, 10th sidebar icon)
 * → "Installed MCP Servers" section.
 *
 * Structure observed on 2026-05-22 (see docs/cursor-ui-observations.md §7):
 *   - Error box (red) shown if any server has a JSON config error
 *   - Server row: avatar (initial) + name + "N tools, M resources enabled ⋄"
 *     + toggle + hover controls (pencil edit, trash delete)
 *   - Clicking ⋄ expands: command path + tool name chips
 *   - "+ New MCP Server" row at the bottom
 *   - "Plugin MCP Servers" section below
 *
 * TODO(stage-3): verify all selectors via live Playwright CDP DOM inspection.
 */
export class MCPPage {
  /** Container holding all installed server rows. */
  private readonly serverListContainer: Locator;
  /** The "+ New MCP Server" button. */
  private readonly addServerButton: Locator;

  constructor(private readonly page: Page) {
    this.serverListContainer = page.locator(
      '[data-testid="mcp-server-list"], .mcp-server-list, section:has(text="Installed MCP Servers")',
    );

    this.addServerButton = page
      .locator('button', { hasText: 'New MCP Server' })
      .or(page.locator('[aria-label*="Add MCP"], [aria-label*="new mcp"]'));
  }

  /** Return the display names of all currently listed MCP servers. */
  async listServerNames(): Promise<string[]> {
    const rows = this.page.locator(
      '[data-testid="mcp-server-item"], .mcp-server-item, ' +
      'div:has(> [role="switch"]):has(text=/tools/)',
    );
    const count = await rows.count();
    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i);
      // The server name is the first bold/heading text in the row.
      const name =
        (await row.locator('[data-testid="server-name"], .server-name').textContent()) ??
        (await row.locator('span, strong, p').first().textContent()) ??
        "";
      const trimmed = name.trim();
      if (trimmed && !trimmed.match(/^\d+ tools/)) names.push(trimmed);
    }
    return names;
  }

  /**
   * Add an MCP server by providing its JSON config string.
   * Clicks "+ New MCP Server" and fills in the config editor.
   * TODO(stage-3): confirm the config input mechanism (inline JSON editor vs form).
   */
  async addServer(configJson: string): Promise<void> {
    await this.addServerButton.click();
    // The JSON editor that appears after clicking "New MCP Server".
    const editor = this.page
      .locator('[data-testid="mcp-config-editor"], .mcp-config-input, textarea[aria-label*="config"]')
      .first();
    await editor.waitFor({ state: "visible", timeout: 5_000 });
    await editor.fill(configJson);
    // Confirm / save button.
    const confirmButton = this.page
      .locator('button', { hasText: /save|confirm|add/i })
      .last();
    await confirmButton.click();
  }

  /** Remove an MCP server by its display name. Clicks the trash icon on hover. */
  async removeServer(name: string): Promise<void> {
    const row = this._serverRow(name);
    await row.hover();
    const deleteButton = row
      .locator('[aria-label*="delete"], [aria-label*="remove"], [title*="Delete"]')
      .or(row.locator('button:nth-last-child(2)')) // trash is second-to-last button on hover
      .first();
    await deleteButton.click();
    // Confirm dialog if present.
    const confirmDelete = this.page
      .locator('button', { hasText: /confirm|delete|yes/i })
      .last();
    await confirmDelete.click().catch(() => {});
  }

  /**
   * Return the tool names advertised by the named server.
   * Expands the server row via the ⋄ chevron first.
   */
  async listServerTools(name: string): Promise<string[]> {
    const row = this._serverRow(name);
    // Click the expand chevron ("N tools, M resources enabled ⋄").
    const expandChevron = row
      .locator('[aria-label*="expand"], .expand-chevron, text=/tools.*enabled/')
      .or(row.locator('button').last())
      .first();
    await expandChevron.click();

    // Tool chips appear after expansion.
    const chips = row.locator(
      '[data-testid="tool-chip"], .mcp-tool-chip, code, span[title]',
    );
    await chips.first().waitFor({ state: "visible", timeout: 5_000 }).catch(() => {});
    return chips.allTextContents();
  }

  /**
   * Return the authorization state of the named server by inspecting the toggle.
   * green toggle (aria-checked="true") + no error indicator = "authorized"
   * grey toggle (aria-checked="false") = "unauthorized"
   * error box present for this server = "error"
   */
  async getServerAuthState(name: string): Promise<ServerAuthState> {
    const row = this._serverRow(name);

    // Check for an error box mentioning this server name.
    const errorBox = this.page.locator(
      '[data-testid="mcp-error"], .mcp-error, div:has-text("MCP configuration errors")',
    );
    const hasError = await errorBox.filter({ hasText: name }).count() > 0;
    if (hasError) return "error";

    const toggle = row.locator('[role="switch"], button[aria-checked]').first();
    const checked = await toggle.getAttribute("aria-checked");
    if (checked === "true") return "authorized";
    if (checked === "false") return "unauthorized";
    return "pending";
  }

  /** Locate the server row by name. */
  private _serverRow(name: string): Locator {
    return this.page
      .locator('[data-testid="mcp-server-item"], .mcp-server-item')
      .filter({ hasText: name })
      .or(
        this.page
          .locator('div[role="listitem"]')
          .filter({ hasText: name }),
      )
      .first();
  }
}
