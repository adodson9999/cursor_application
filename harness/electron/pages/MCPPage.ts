import { Locator, Page } from "@playwright/test";

export type ServerAuthState = "authorized" | "unauthorized" | "pending" | "error";

/** Page object for Cursor's MCP server management panel. */
export class MCPPage {
  private readonly serverList: Locator;
  private readonly addServerButton: Locator;

  constructor(private readonly page: Page) {
    this.serverList = page.locator('[data-testid="mcp-server-list"], .mcp-server-item');
    this.addServerButton = page.locator('[aria-label="Add MCP server"], [data-testid="add-mcp-server"]').first();
  }

  /** Return the names of all currently listed MCP servers. */
  async listServerNames(): Promise<string[]> {
    throw new Error("stub: Stage 2 fills in");
  }

  /** Add an MCP server by providing its config JSON inline. */
  async addServer(configJson: string): Promise<void> {
    throw new Error("stub: Stage 2 fills in");
  }

  /** Remove an MCP server by its display name. */
  async removeServer(name: string): Promise<void> {
    throw new Error("stub: Stage 2 fills in");
  }

  /** Return the tools advertised by the named server. */
  async listServerTools(name: string): Promise<string[]> {
    throw new Error("stub: Stage 2 fills in");
  }

  /** Return the authorization state of the named server. */
  async getServerAuthState(name: string): Promise<ServerAuthState> {
    throw new Error("stub: Stage 2 fills in");
  }
}
