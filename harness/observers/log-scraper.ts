import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

import chokidar from "chokidar";

import { logger } from "../util/logger.js";

export interface LogMatch {
  sourceFile: string;
  line: string;
  ts: string;
}

/** Default Cursor log directory on macOS. */
const CURSOR_LOG_DIR = path.join(
  os.homedir(),
  "Library",
  "Logs",
  "Cursor"
);

/**
 * Tail Cursor's log directory, filtering lines by regex, appending matches
 * to outJsonl. Returns a stopper function.
 */
export function scrapeLogs(
  filterRegex: RegExp,
  outJsonl: string,
  logDir: string = CURSOR_LOG_DIR
): () => Promise<void> {
  const watcher = chokidar.watch(`${logDir}/**/*.log`, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: false,
  });

  const tailedFiles = new Map<string, number>();

  const processNewLines = async (filePath: string): Promise<void> => {
    const stat = await fs.stat(filePath).catch(() => null);
    if (!stat) return;

    const offset = tailedFiles.get(filePath) ?? 0;
    const fd = await fs.open(filePath, "r");
    const stream = fd.createReadStream({ start: offset });
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    let bytesRead = offset;
    for await (const line of rl) {
      bytesRead += Buffer.byteLength(line, "utf8") + 1;
      if (filterRegex.test(line)) {
        const match: LogMatch = {
          sourceFile: filePath,
          line,
          ts: new Date().toISOString(),
        };
        await fs.appendFile(outJsonl, JSON.stringify(match) + "\n", "utf8");
        logger.debug(match, "log-scraper match");
      }
    }

    tailedFiles.set(filePath, bytesRead);
    await fd.close();
  };

  watcher.on("add", (p: string) => void processNewLines(p));
  watcher.on("change", (p: string) => void processNewLines(p));

  logger.info({ logDir, outJsonl }, "log-scraper started");

  return async () => {
    await watcher.close();
    logger.info({ logDir }, "log-scraper stopped");
  };
}
