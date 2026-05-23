# Cursor UI Observations — Live Exploration Reference

> **Captured:** 2026-05-22, Cursor version as seen in UI (Sonnet 4.6 / GPT-5.5 era)
> **Method:** Live computer-use exploration of a running Cursor instance. No API tokens consumed.
> **Purpose:** Ground-truth reference for Stage 2 Playwright selectors. Do not re-explore from scratch — update this file instead.

---

## 1. Overall Window Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ [traffic lights] [sidebar toggle] [←→]    15_min_check    [Upgrade to Pro][□][💬][⚙️] │
├────────┬────────────────────────────────┬──┬───────────────────────────┤
│        │  [tab: file] [tab: file] [tab: Cursor Settings]  │ [▷][+][⊙][…][□] │
│Activity│                                │  ├───────────────────────────┤
│  Bar   │       Code Editor Area         │  │    Chat / Agent Panel     │
│(icons) │    (syntax-highlighted code)   │  │   (conversation + input)  │
│        │                                │  │                           │
│Explorer│                                │  │                           │
│ Panel  │                                │  │                           │
├────────┴────────────────────────────────┴──┴───────────────────────────┤
│  [Problems 12] [Output] [Terminal …]       zsh   [+][□][🗑️][…][∧][✕]  │
│  ─────────────────── terminal output ─────────────────────────────────  │
├────────────────────────────────────────────────────────────────────────┤
│ [><] [🚀 Launchpad] [project] [⊗0 ⚠0 ℹ12] [ext]      Cursor Tab  Ln Col │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Top-Right Toolbar (always visible)

| Visual | Function | Notes |
|---|---|---|
| `Upgrade to Pro` | Subscription CTA | Button with text |
| `□` | Window layout toggle | Switches between layouts |
| `💬` | (unclear — feedback?) | Icon-only button |
| `⚙️` | Opens Cursor Settings tab | Gear icon; shortcut `⌘⇧J` |

**Playwright selector for gear:**
```ts
// By aria-label (preferred)
page.locator('[aria-label="Cursor Settings"]')
// Fallback: button near "Upgrade to Pro"
page.locator('button').filter({ hasText: /settings/i }).last()
```

---

## 3. Chat / Agent Panel (Right Panel)

### 3.1 Tab Bar

Each conversation appears as a tab. Two states:

| State | Tab Label | Icon |
|---|---|---|
| Existing conversation | `□ Permission error in P… ×` | Square chat-bubble icon |
| New empty chat | `□ New Agent ×` | Square chat-bubble icon |

Active tab has a **blue underline**.

**Playwright selectors:**
```ts
// Identify any chat tab by icon + text
page.locator('[aria-label*="agent"], [aria-label*="chat"]').first()
// New Agent tab specifically
page.locator('tab', { hasText: 'New Agent' })
// Close (×) button on a tab
page.locator('.tab .close-editor-action')
```

### 3.2 Panel Header Toolbar

Five buttons right of the tab bar (left → right):

| Icon | Label | Action |
|---|---|---|
| `▷` | Run | Executes current plan / runs terminal command |
| `+` | New chat | Creates "New Agent" tab |
| `⊙` | History | Dropdown: search + conversation list |
| `…` | More options | Dropdown menu (see §3.3) |
| `□` | Layout | Toggles single vs. split panel view |

**Playwright selectors:**
```ts
// New chat button — the + in the panel header, NOT the editor tab +
page.locator('[aria-label="New Chat"], [aria-label="New Agent"]')
// Fallback by position: + button that is NOT in the editor tab bar
page.locator('.chat-header button[aria-label*="new"], .chat-header button[aria-label*="New"]')
// History button
page.locator('[aria-label="Chat History"], [aria-label="History"]')
// More options (…)
page.locator('[aria-label*="more"], [aria-label*="More"]').last()
```

### 3.3 "…" More Menu Items

Opened by clicking the `…` button. Full item list:

```
Open Browser
Export Transcript
Copy Request ID
Give Feedback
──────────────
Agent Settings
Show Opened Editors
──────────────
Close All          [⌘R W]
Close Saved        [⌘R U]
✓ Enable Preview Editors
Lock Group
Configure Editors
Configure Icon Visibility
```

**Playwright selector:**
```ts
// After clicking …, items appear in a context menu
page.locator('[role="menuitem"]', { hasText: 'Agent Settings' })
page.locator('[role="menuitem"]', { hasText: 'Export Transcript' })
```

### 3.4 History Dropdown

Opened by clicking `⊙` (History button). Structure:

```
[Search Agents…]        ← text input
Older
  ⊙ Permission error in Pytho…   […] [📌] [🗑️]
> Archived                         ← collapsed section
```

**Playwright selectors:**
```ts
// Search input inside history dropdown
page.locator('[placeholder="Search Agents…"], [placeholder*="Search"]')
// Individual history entry
page.locator('.chat-history-item, [data-testid="history-item"]')
// Archived section toggle
page.locator('text=Archived').first()
```

---

## 4. Chat Input Area

### 4.1 Structure (bottom of right panel)

```
┌────────────────────────────────────────────────────────────┐
│  > 1 File                                          Review  │  ← file-context bar (when files attached)
├────────────────────────────────────────────────────────────┤
│  Plan, Build, / for commands, @ for context                │  ← textarea
│                                                            │
├────────────────────────────────────────────────────────────┤
│  [∞ Agent ∨]  [Auto 🔒]                    [○] [🖇️] [🎤]  │  ← bottom toolbar
└────────────────────────────────────────────────────────────┘
```

### 4.2 The Textarea

- **Placeholder text (exact):** `Plan, Build, / for commands, @ for context`
- `/ ` triggers a slash-command menu
- `@ ` triggers a context picker (files, symbols, docs, etc.)

**Playwright selectors:**
```ts
// Primary — placeholder is unique and stable
page.locator('[placeholder="Plan, Build, / for commands, @ for context"]')
// Role-based fallback
page.locator('[role="textbox"][aria-multiline="true"]').last()
// If Cursor wraps in a contenteditable div
page.locator('.chat-input [contenteditable="true"]')
```

### 4.3 File Context Bar ("> 1 File")

Only visible when files are attached to the conversation.

```
> 1 File                                                Review
```

- Click `> 1 File` to expand/collapse the attached file list
- `Review` button opens a diff/review pane

**Playwright selectors:**
```ts
// File count chip
page.locator('text=/> \\d+ File/')
// Review button
page.locator('button', { hasText: 'Review' })
```

### 4.4 Mode Selector (`∞ Agent ∨`)

Clicking opens a dropdown with all modes:

| Icon | Mode | Shortcut |
|---|---|---|
| `∞` | **Agent** | ⌘1 (default, currently selected ✓) |
| `□` | **Plan** | — |
| `⌫` | **Debug** | — |
| `⊞` | **Multitask** | — |
| `□` | **Ask** | — |

**Playwright selectors:**
```ts
// Mode selector button (shows current mode text)
page.locator('button', { hasText: /agent|plan|debug|multitask|ask/i }).first()
// After opening, select a mode by text
page.locator('[role="option"], [role="menuitem"]', { hasText: 'Plan' })
// Or by aria-label
page.locator('[aria-label*="mode"], [data-mode]')
```

### 4.5 Model Selector (`Auto 🔒`)

- **Free tier:** Shows "Auto 🔒" — clicking shows upgrade tooltip ("Upgrade to unlock premium models")
- **Paid tier:** Would show a dropdown of available models (Composer 2.5, GPT-5.5, etc.)
- The `🔒` padlock icon indicates the model is locked to auto-selection

**Playwright selectors:**
```ts
// Model selector button
page.locator('button', { hasText: /auto|claude|gpt|sonnet|opus/i })
// Locked state indicator
page.locator('[aria-label*="model"]')
```

### 4.6 Action Buttons (right side of bottom toolbar)

| Icon | Present when | Action |
|---|---|---|
| `○` (ring) | During active streaming only | Stop generation |
| `🖇️` (paperclip) | Always | Attach file |
| `🎤` (microphone) | Always | Voice input |

**Playwright selectors:**
```ts
// Stop button — only visible during streaming
page.locator('[aria-label="Stop"], [aria-label*="stop"]')
// Attach file button
page.locator('[aria-label="Attach"], [aria-label*="attach"], [aria-label*="file"]')
// Voice button
page.locator('[aria-label="Voice"], [aria-label*="voice"], [aria-label*="microphone"]')
```

---

## 5. Chat Message Area

### 5.1 User Messages

- Appear as **dark rounded rectangles** at the top of the conversation
- May show an edit/undo icon on hover

```ts
// Last user message
page.locator('.human-message, [data-type="human"], [data-role="user"]').last()
```

### 5.2 AI (Assistant) Responses

- Appear below as plain text with Markdown rendering
- Code blocks are syntax-highlighted
- A `…` button appears at the bottom of each response (copy, retry, etc.)
- A `↩` revert icon appears on user messages

```ts
// Last AI response — content area
page.locator('.assistant-message, [data-type="assistant"], [data-role="assistant"]').last()
// Streaming indicator (appears during generation)
page.locator('.streaming-indicator, [data-streaming="true"]')
// Copy code button inside a response
page.locator('[aria-label*="copy"], [aria-label*="Copy"]').last()
```

### 5.3 Tool Call / Agent Action Entries

When Agent mode executes tool calls, they appear as collapsible entries in the conversation:

```ts
// Tool call entry
page.locator('.tool-call, [data-type="tool_call"]')
// Tool call name
page.locator('.tool-call-name, [data-tool-name]')
// Approve button (when approval required)
page.locator('button', { hasText: /approve|allow|run/i })
// Reject button
page.locator('button', { hasText: /reject|deny|cancel/i })
```

---

## 6. Settings Panel

### 6.1 Opening Settings

- **Keyboard:** `⌘⇧J` → opens "Cursor Settings" tab
- **Mouse:** Click ⚙️ gear icon (top-right, next to "Upgrade to Pro")
- **VS Code Settings:** `⌘⇧,` → opens "VS Code Settings" tab (separate)

```ts
// Open via gear icon
page.locator('[aria-label="Cursor Settings"], [title="Cursor Settings"]')
// The settings tab once open
page.locator('.tab', { hasText: 'Cursor Settings' })
```

### 6.2 Settings Sidebar Navigation

The left sidebar has icon buttons that switch settings sections. The exact `aria-label` values need DOM verification but the visual layout (top→bottom) is:

| Position | Visual | Section opened |
|---|---|---|
| 1 | `A` (avatar) | Account / Profile |
| 2 | `⚙️` | General |
| 3 | `≡` (sliders) | VS Code Settings (new tab) |
| — | separator | — |
| 4 | funnel | **Agents** |
| 5 | `→\|` | **Tab** (Cursor Tab / autocomplete) |
| 6 | `□` (cube) | **Models** |
| 7 | `☁️` | **Cloud Agents** |
| — | separator | — |
| 8 | `⊞` (grid) | **Plugins** |
| 9 | `≡` (lines/book) | **Rules, Skills, Subagents** |
| 10 | `✏️` (pencil) | **Tools** ← MCP lives here |
| 11 | `⚡` (bolt) | **Hooks** |

```ts
// Navigate to a settings section by clicking its sidebar icon
// Best selector once DOM is inspected: aria-label on each nav button
// Interim: nth-child on the nav container
page.locator('.settings-sidebar button').nth(3) // Agents (0-indexed from top after skipping separators)
```

### 6.3 General Settings — Notable Items

| Setting | Type | Current value |
|---|---|---|
| Window Layout | Visual toggle | Agent / Editor |
| Conversation Density | Dropdown | Detailed |
| Title Bar | Toggle | ON |
| Status Bar | Toggle | ON |
| Review Control Location | Dropdown | Breadcrumb |
| Auto-hide editor when empty | Toggle | OFF |
| Open chat as editor tabs | Toggle | ON |
| System Notifications | Toggle | ON |
| Menu Bar Icon | Toggle | ON |
| Completion Sound | Toggle | OFF |
| Data Sharing Enabled | Checkbox + dropdown | Share Data |

### 6.4 Agents Settings

| Setting | Type | Current value |
|---|---|---|
| Text Size | Dropdown | Default |
| Submit with ⌘+Enter | Toggle | OFF |
| Max Tab Count | Number + dropdown | 5 / Custom |
| Queue Messages | Dropdown | Send after current message |
| Agent Autocomplete | Toggle | ON |
| Auto-Approve Mode Transitions | Toggle | OFF |
| Open Agents Window on startup | Toggle | (not observed) |

### 6.5 Tab (Autocomplete) Settings

| Setting | Type | Current value |
|---|---|---|
| Cursor Tab | Toggle | ON |
| Partial Accepts (⌘→) | Toggle | OFF |
| Suggestions While Commenting | Toggle | ON |
| Whitespace-Only Suggestions | Toggle | OFF |
| Imports (TypeScript) | Toggle | ON |
| Auto Import for Python | Toggle | OFF (BETA) |
| Ignored Files | Text input | (glob patterns) |

### 6.6 Models Settings

Search input: `[placeholder="Add or search model"]` + refresh `↺` button.

Observed installed models (all toggled ON):
- Composer 2.5
- GPT-5.5
- Codex 5.3
- Sonnet 4.6

```ts
// Model list item
page.locator('.model-list-item').filter({ hasText: 'Sonnet 4.6' })
// Toggle for a specific model
page.locator('.model-list-item').filter({ hasText: 'GPT-5.5' }).locator('button[role="switch"]')
```

---

## 7. MCP Panel (inside Tools Settings)

### 7.1 Access Path

```
⚙️ (gear icon, top-right) → Cursor Settings tab → ✏️ (pencil/Tools icon in sidebar)
```

Or via keyboard + scroll to the "Installed MCP Servers" section.

### 7.2 Structure

```
Tools
├── Browser
│   ├── Browser Automation    [Off ▾]
│   └── Show Localhost Links  [toggle ON]
│
└── Installed MCP Servers
    ├── ⊗ MCP configuration errors:           ← error box (red border)
    │     extension-GitKraken: JSON syntax…   [Open JSON]
    │
    ├── [E] extension-GitKraken  [✏️] [🗑️]  [toggle ON]
    │       29 tools, 2 resources enabled ⋄   ← expand chevron
    │       (expanded):
    │         /path/to/mcp/server --args…      ← command
    │         [app_tool_box] [git_add_or_commit] [git_blame] …  ← tool chips
    │
    ├── [+] New MCP Server
    │       Add a Custom MCP Server
    │
    └── Plugin MCP Servers
          From plugins installed in Cursor
```

### 7.3 MCP Server Row (collapsed state)

```ts
// Server list container
page.locator('[data-testid="mcp-server-list"], .mcp-server-list')
// Individual server row by name
page.locator('.mcp-server-item').filter({ hasText: 'extension-GitKraken' })
// Server enable/disable toggle
page.locator('.mcp-server-item').filter({ hasText: serverName }).locator('[role="switch"]')
// Tool count text ("29 tools, 2 resources enabled")
page.locator('.mcp-server-item').filter({ hasText: serverName }).locator('text=/\\d+ tools/')
// Expand chevron ⋄
page.locator('.mcp-server-item').filter({ hasText: serverName }).locator('[aria-label*="expand"], .expand-chevron')
```

### 7.4 MCP Server Row (expanded state — after clicking ⋄)

```ts
// Command/path text
page.locator('.mcp-server-command, [data-testid="mcp-command"]')
// Tool chip (individual tool name tag)
page.locator('.mcp-tool-chip, [data-testid="tool-chip"]', { hasText: 'git_branch' })
// All tool names as text array (evaluate)
const tools = await page.locator('.mcp-tool-chip').allTextContents()
```

### 7.5 Server Hover Controls

On hover over a server row, two buttons appear:

```ts
// Edit server (pencil icon) — appears on hover
page.locator('.mcp-server-item').filter({ hasText: serverName }).locator('[aria-label*="edit"], button:has([data-icon="edit"])')
// Delete server (trash icon)
page.locator('.mcp-server-item').filter({ hasText: serverName }).locator('[aria-label*="delete"], [aria-label*="remove"]')
```

### 7.6 Add New MCP Server Button

```ts
// "New MCP Server" row
page.locator('button', { hasText: 'New MCP Server' })
// Or by subtitle text
page.locator('text=Add a Custom MCP Server').locator('..').locator('..')
```

### 7.7 MCP Error Box

```ts
// Error container
page.locator('.mcp-error, [data-testid="mcp-error"]')
// "Open JSON" button inside the error box
page.locator('button', { hasText: 'Open JSON' })
```

### 7.8 Server Auth State

Based on the toggle (green = enabled/authorized, grey = disabled):
- Green toggle + green dot = connected & authorized
- Grey toggle = disabled (not connected)
- Red indicator + error box = config error

```ts
// Check if a server is enabled
const isEnabled = await page.locator('.mcp-server-item')
  .filter({ hasText: serverName })
  .locator('[role="switch"]')
  .getAttribute('aria-checked')
// "true" = authorized/enabled, "false" = disabled
```

---

## 8. Activity Bar (Left Sidebar)

### 8.1 Icon Buttons (top section)

| Icon | Action |
|---|---|
| Files/explorer | Open file explorer |
| Search (magnifier) | Open search |
| Git (branch) | Open source control |
| Extensions (square) | Open extensions |
| `…` | More views dropdown |

```ts
// Explorer view
page.locator('[aria-label="Explorer"]')
// Search view
page.locator('[aria-label="Search"]')
// Source Control
page.locator('[aria-label="Source Control"]')
```

### 8.2 Explorer Panel

When file explorer is open:
```ts
// File tree item
page.locator('.explorer-item, [data-resource-name]', { hasText: 'main.py' })
// Expand folder
page.locator('[aria-label*="Expand"], .tree-item.collapsible').first()
```

---

## 9. Bottom Panel

```ts
// Problems tab
page.locator('.panel-tab', { hasText: 'Problems' })
// Output tab
page.locator('.panel-tab', { hasText: 'Output' })
// Terminal tab
page.locator('.panel-tab', { hasText: 'Terminal' })
// Terminal content (read-only in Playwright for Electron)
page.locator('.terminal .xterm-viewport')
// New terminal button
page.locator('[aria-label*="New Terminal"], [aria-label*="new terminal"]')
```

---

## 10. Status Bar (Bottom)

```ts
// Error count
page.locator('.statusbar-item', { hasText: /⊗\s*\d+/ })
// Warning count
page.locator('.statusbar-item', { hasText: /⚠\s*\d+/ })
// "Cursor Tab" indicator (autocomplete active)
page.locator('.statusbar-item', { hasText: 'Cursor Tab' })
// Language mode indicator (e.g., "Python")
page.locator('[aria-label*="language mode"], .language-status')
// Line/Col indicator
page.locator('.cursor-status, [aria-label*="Go to Line"]')
```

---

## 11. Keyboard Shortcuts Reference

| Action | Shortcut |
|---|---|
| Open Cursor Settings | `⌘⇧J` |
| Open VS Code Settings | `⌘⇧,` |
| Open AI chat (Cmd+L) | `⌘L` |
| Open Composer/Agent | `⌘I` |
| Inline edit | `⌘K` |
| Command Palette | `⌘⇧P` |
| Mode menu | `⌘.` |
| Select Agent mode | `⌘1` |
| New Terminal | `⌘⇧\`` |
| Toggle sidebar | `⌘B` |

---

## 12. Selector Verification Priority

The selectors above are **best-effort from visual inspection**. They should be verified in Stage 3 against a live Playwright session with DOM access. Priority order for verification:

1. **`aria-label`** — most stable across Cursor updates
2. **`data-testid`** — stable if Cursor ships testids (unconfirmed)
3. **`placeholder`** — very stable for the main chat textarea
4. **`:has-text()`** — reliable for unique text content
5. **CSS class** — brittle in production Electron builds (obfuscated)
6. **`:nth-child()`** — last resort, layout-dependent

---

## 13. Notes for Stage 2 Implementation

1. **Composer vs. Chat panel**: In Cursor 3.x there is no separate "Composer" concept — it's all the unified Agent panel (right side). The `ComposerPage` page object maps to this panel.

2. **Agent activation**: "Agent mode" is the default. Switching modes via the `∞ Agent ∨` dropdown activates Plan / Debug / Multitask / Ask. The toggle in Stage 1's `AgentPage.activate()` stub should click the mode selector and choose "Agent" if not already selected.

3. **Tool calls in agent mode**: When agent runs, tool call entries appear in the message stream. Their exact DOM structure needs live Playwright inspection to confirm class names.

4. **Stream completion detection**: No explicit "done" indicator was observed. Strategy: wait for the Stop button (○) to disappear, or wait for the streaming CSS class to be removed from the last message.

5. **MCP navigation path**: Settings → Tools section (pencil icon, 10th in sidebar) → scroll to "Installed MCP Servers". Cannot be navigated to via a direct URL or `data-panel` attribute — requires clicking through the settings sidebar.

6. **Settings sidebar icon order**: The exact y-coordinates of sidebar icons may shift if new sections are added. Prefer `aria-label` over positional clicks.

7. **Model selector on free plan**: The `Auto 🔒` button opens an upgrade tooltip, not a model list. In tests targeting model selection, set `CURSOR_MOCK_MODEL=true` or skip if running on free tier.
