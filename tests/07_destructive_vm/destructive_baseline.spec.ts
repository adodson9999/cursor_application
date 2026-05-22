import { expect } from "@playwright/test";

import { test } from "../../harness/electron/fixtures/cursor-app.js";

// VM-only: these tests make irreversible changes to the host OS.
// Always run via vms/tart/run-in-vm.sh or vms/utm/README.md workflow.

test.skip("VM baseline: MCP config survives crash-recovery cycle", async ({ cursorApp }) => {
  if (!process.env["RUN_IN_VM"]) {
    test.skip(true, "RUN_IN_VM not set — skipping destructive test outside VM");
    return;
  }
  // Stage 2: write MCP config, hard-kill Cursor, relaunch, assert config intact.
  expect(cursorApp.pid).toBeGreaterThan(0);
});

test.skip("VM baseline: Cursor extension host restarts after OOM kill", async ({ cursorApp }) => {
  if (!process.env["RUN_IN_VM"]) {
    test.skip(true, "RUN_IN_VM not set — skipping destructive test outside VM");
    return;
  }
  // Stage 2: apply memory pressure, trigger OOM, assert extension host re-initialises.
  expect(cursorApp.pid).toBeGreaterThan(0);
});
