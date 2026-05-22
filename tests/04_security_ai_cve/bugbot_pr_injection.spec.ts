/**
 * Bugbot PR injection — prompt injection via malicious PR comment
 *
 * Source:   Described in Cursor security advisories and Snyk analysis of Bugbot's
 *   MCP tool scope; no CVE has been assigned as of this writing.
 * CVSS:     Not assigned
 * Affected: Cursor Bugbot in auto-review configurations with unscoped MCP tool access
 * Fixed in: No specific patched version; risk class requires operator-level scope
 *   restrictions on the Bugbot review agent's MCP tool access.
 * Mechanism: A malicious PR comment contains an indirect prompt injection payload
 *   targeting Cursor's Bugbot review agent. If the agent runs with broad MCP tool
 *   access and no scoped allowlist, the injected payload can instruct it to take
 *   actions beyond the diff — such as approving PRs, posting comments on unrelated
 *   issues, or exfiltrating repository metadata — without human review. The durability
 *   risk arises if Bugbot persists learned rules across review sessions.
 *
 * This is a regression baseline, not a discovery. It runs against the
 * latest Cursor build to confirm the patch holds.
 *
 * Status: skipped during build sprint. Un-skip to run.
 */
import { test } from "../../harness/electron/fixtures/cursor-app.js";

test.skip(
  "Bugbot PR injection: malicious PR comment instructs review agent to act beyond diff scope",
  async ({ firstWindow: _ }) => {
    // Full repro requires a local Bugbot-clone stub; see malicious_mcp/github_clone/.
    // Stage 2 fills in the complete fixture setup and assertion sequence once the
    // clone stub is wired to the harness.
  }
);
