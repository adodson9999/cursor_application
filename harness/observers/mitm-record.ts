import { execaCommand } from "execa";

import { logger } from "../util/logger.js";

export interface MitmHandle {
  /** Stop the mitmdump process and wait for it to exit. */
  stop(): Promise<void>;
  /** Path to the mitmproxy flow file being written. */
  flowPath: string;
}

/**
 * Spawn mitmdump in transparent local mode targeting Cursor, writing flows to
 * flowPath. Bails with a clear error if the mitmproxy CA is not trusted by
 * macOS — see docs/ARCHITECTURE.md for the keychain install command.
 */
export async function startMitmRecord(flowPath: string): Promise<MitmHandle> {
  // Verify the CA is installed before spawning, to surface the error cleanly.
  await assertCaTrusted();

  const proc = execaCommand(
    `mitmdump --mode local:Cursor --set save_stream_file=${flowPath}`,
    { reject: false, all: true }
  );

  logger.info({ flowPath }, "mitm-record started");

  return {
    flowPath,
    stop: async () => {
      proc.kill("SIGTERM");
      await proc;
      logger.info({ flowPath }, "mitm-record stopped");
    },
  };
}

/** Verify the mitmproxy CA certificate is trusted in the macOS System keychain. */
async function assertCaTrusted(): Promise<void> {
  const { stdout, exitCode } = await execaCommand(
    'security find-certificate -c mitmproxy -p /Library/Keychains/System.keychain',
    { reject: false }
  );

  if (exitCode !== 0 || !stdout.includes("BEGIN CERTIFICATE")) {
    throw new Error(
      "mitmproxy CA not found in macOS System keychain. " +
        "Install it with: sudo security add-trusted-cert -d -r trustRoot " +
        "-k /Library/Keychains/System.keychain ~/.mitmproxy/mitmproxy-ca-cert.pem " +
        "(see docs/ARCHITECTURE.md)"
    );
  }
}
