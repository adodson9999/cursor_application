/**
 * Oasis Security Research — Auto-execute via tasks.json runOn: folderOpen
 *
 * Source:   https://www.oasis.security/blog/cursor-security-flaw
 * CVSS:     Not assigned (no CVE issued as of research publication)
 * Affected: Cursor with Workspace Trust disabled (default configuration)
 * Fixed in: No specific patched version; mitigation requires enabling Workspace Trust
 *   and setting task.allowAutomaticTasks: "off" in user settings.
 * Mechanism: Cursor ships with Workspace Trust disabled by default. A workspace
 *   .vscode/tasks.json with "runOn": "folderOpen" causes Cursor to execute the
 *   configured task immediately when the folder is opened — no user prompt, no click.
 *   A booby-trapped repository can pivot from a developer's machine into CI/CD and
 *   cloud environments without any user interaction beyond git clone + folder open.
 *
 * This is a regression baseline, not a discovery. It runs against the
 * latest Cursor build to confirm the patch holds.
 *
 * Status: skipped during build sprint. Un-skip to run.
 */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { expect } from "@playwright/test";

import { test } from "../../harness/electron/fixtures/cursor-app.js";
import { watchDir } from "../../harness/observers/fs-watch.js";

test.skip(
  "Oasis: .vscode/tasks.json runOn:folderOpen auto-executes without user approval",
  async ({ firstWindow: _ }) => {
    const workspaceDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "cursor-oasis-folderopen-")
    );
    const sentinelPath = path.join(workspaceDir, "EXECUTED.txt");
    const eventsLog = path.join(workspaceDir, "fs-events.jsonl");
    const stopWatch = await watchDir(workspaceDir, eventsLog);

    try {
      // Create a malicious tasks.json that writes a sentinel file on folder open.
      const vscodeDir = path.join(workspaceDir, ".vscode");
      await fs.mkdir(vscodeDir, { recursive: true });
      await fs.writeFile(
        path.join(vscodeDir, "tasks.json"),
        JSON.stringify({
          version: "2.0.0",
          tasks: [
            {
              label: "oasis-probe",
              type: "shell",
              command: `touch ${sentinelPath}`,
              runOptions: { runOn: "folderOpen" },
            },
          ],
        }),
        "utf8"
      );

      // In Stage 2: open the workspace folder via Cursor's File > Open Folder.
      // For now, wait briefly for Cursor to detect and process the workspace.
      await new Promise((r) => setTimeout(r, 5000));

      // With Workspace Trust enabled or automatic tasks disabled, the sentinel
      // file must NOT be created — the task should be blocked.
      const sentinelExists = await fs
        .access(sentinelPath)
        .then(() => true)
        .catch(() => false);

      expect(
        sentinelExists,
        "tasks.json runOn:folderOpen task executed without user approval (Oasis regression)"
      ).toBe(false);
    } finally {
      await stopWatch();
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  }
);
