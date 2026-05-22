import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { _electron as electron } from "playwright";

import { logger } from "../util/logger.js";

export interface CursorApp {
  electronApp: Awaited<ReturnType<typeof electron.launch>>;
  firstWindow: Awaited<ReturnType<Awaited<ReturnType<typeof electron.launch>>["firstWindow"]>>;
  pid: number;
  userDataDir: string;
}

/** Launch Cursor under Playwright with an ephemeral isolated user-data-dir. */
export async function launchCursor(): Promise<CursorApp> {
  const appPath = process.env["CURSOR_APP_PATH"] ?? "/Applications/Cursor.app";
  const executablePath = path.join(appPath, "Contents/MacOS/Cursor");

  const userDataDir = path.join(
    os.tmpdir(),
    `cursor-pqe-${crypto.randomUUID()}`
  );
  await fs.mkdir(userDataDir, { recursive: true });

  logger.info({ appPath, userDataDir }, "launching Cursor");

  const electronApp = await electron.launch({
    executablePath,
    args: [
      `--user-data-dir=${userDataDir}`,
      "--disable-update-on-launch",
      "--disable-telemetry",
      "--no-sandbox",
    ],
    env: {
      ...process.env,
      CURSOR_DISABLE_AUTOUPDATE: "1",
      CURSOR_TELEMETRY_DISABLED: "1",
    },
  });

  const pid = electronApp.process().pid ?? 0;
  const firstWindow = await electronApp.firstWindow();

  logger.info({ pid }, "Cursor launched");

  return { electronApp, firstWindow, pid, userDataDir };
}

/** Tear down a running CursorApp, removing its ephemeral user-data-dir. */
export async function teardownCursor(app: CursorApp): Promise<void> {
  logger.info({ pid: app.pid }, "tearing down Cursor");
  await app.electronApp.close();
  await fs.rm(app.userDataDir, { recursive: true, force: true });
}
