import os from "node:os";
import path from "node:path";

import { execa } from "execa";

import { logger } from "../util/logger.js";

export interface MitmHandle {
  pid: number;
  flowPath: string;
  /** Stop mitmdump gracefully (SIGTERM → SIGKILL after 5 s). Always resolves. */
  stop(): Promise<void>;
}

export class MitmCaMissingError extends Error {
  constructor() {
    super(
      "mitmproxy CA certificate not found at ~/.mitmproxy/mitmproxy-ca-cert.pem. " +
        "Install it once with:\n" +
        "  security add-trusted-cert -d -r trustRoot \\\n" +
        "    -k ~/Library/Keychains/login.keychain-db \\\n" +
        "    ~/.mitmproxy/mitmproxy-ca-cert.pem\n" +
        "See docs/ARCHITECTURE.md for the full walkthrough.",
    );
    this.name = "MitmCaMissingError";
  }
}

/** Verify the mitmproxy CA cert exists in the user's home directory. */
async function assertCaTrusted(): Promise<void> {
  const certPath = path.join(os.homedir(), ".mitmproxy", "mitmproxy-ca-cert.pem");
  try {
    await import("node:fs/promises").then((m) => m.access(certPath));
  } catch {
    throw new MitmCaMissingError();
  }
}

/**
 * Spawn mitmdump in transparent local mode targeting Cursor, writing all
 * captured flows to flowPath. Bails with MitmCaMissingError if the CA is absent.
 *
 * Requires mitmproxy 10+ for --mode local:<process>.
 */
export async function recordCursorTraffic(flowPath: string): Promise<MitmHandle> {
  await assertCaTrusted();

  const proc = execa(
    "mitmdump",
    ["--mode", "local:Cursor", `--save-stream-file`, flowPath, "-q"],
    { reject: false, all: true },
  );

  const pid = proc.pid ?? 0;
  logger.info({ pid, flowPath }, "mitm-record: started");

  let stopped = false;

  const stop = async (): Promise<void> => {
    if (stopped) return;
    stopped = true;

    proc.kill("SIGTERM");

    const killTimer = setTimeout(() => {
      if (!proc.killed) proc.kill("SIGKILL");
    }, 5_000);

    try {
      await proc;
    } catch {
      // Swallow — process may have already exited.
    } finally {
      clearTimeout(killTimer);
      logger.info({ pid, flowPath }, "mitm-record: stopped");
    }
  };

  return { pid, flowPath, stop };
}
