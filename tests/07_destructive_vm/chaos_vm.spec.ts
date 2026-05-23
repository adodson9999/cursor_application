import { expect } from "@playwright/test";

import { test } from "../../harness/electron/fixtures/cursor-app.js";

// This file must only run inside an expendable macOS VM.
// The RUN_IN_VM guard prevents accidental execution on a developer machine.

test.skip("VM chaos: Cursor survives SIGTERM and relaunches cleanly", async ({ cursorApp }) => {
  if (!process.env["RUN_IN_VM"]) {
    test.skip(true, "RUN_IN_VM not set — skipping destructive test outside VM");
    return;
  }
  // Stage 2: send SIGTERM to Cursor PID, wait, verify relaunch succeeds.
  expect(cursorApp.pid).toBeGreaterThan(0);
});

test.skip("VM chaos: disk full condition does not corrupt workspace state", async ({ cursorApp }) => {
  if (!process.env["RUN_IN_VM"]) {
    test.skip(true, "RUN_IN_VM not set — skipping destructive test outside VM");
    return;
  }
  // Stage 2: fill disk via fallocate, trigger a Composer save, assert no data loss on recovery.
  expect(cursorApp.pid).toBeGreaterThan(0);
});
