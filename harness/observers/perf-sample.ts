import { execa } from "execa";

import { logger } from "../util/logger.js";

/**
 * Capture a macOS stack sample of a running process using /usr/bin/sample.
 * Writes the human-readable sample report to outPath.
 * Surfaces stderr verbatim on non-zero exit.
 */
export async function sampleProcess(
  pid: number,
  durationSec: number,
  outPath: string,
): Promise<void> {
  logger.info({ pid, durationSec, outPath }, "perf-sample: starting");

  const { exitCode, stderr } = await execa(
    "/usr/bin/sample",
    [String(pid), String(durationSec), "-file", outPath],
    { stdio: ["ignore", "ignore", "pipe"], reject: false },
  );

  if (exitCode !== 0) {
    throw new Error(
      `/usr/bin/sample exited with code ${exitCode}:\n${stderr}`,
    );
  }

  logger.info({ pid, outPath }, "perf-sample: complete");
}
