import { appendFile, mkdir, open, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";

import chokidar from "chokidar";

import { logger } from "../util/logger.js";

export interface LogMatch {
  ts: string;
  file: string;
  line: string;
}

/** Default Cursor log directory on macOS. */
const CURSOR_LOG_DIR = path.join(os.homedir(), "Library", "Logs", "Cursor");

/** Maximum bytes read from a single file per change event (guards against huge rotations). */
const MAX_READ_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Tail Cursor's log directory, applying matchRegex to each new line and
 * appending matches to outJsonl as { ts, file, line }. Returns a stopper.
 * If the log directory does not exist yet, logs a warning and resolves early.
 */
export async function scrapeLogs(
  matchRegex: RegExp,
  outJsonl: string,
  logDir: string = CURSOR_LOG_DIR,
): Promise<() => Promise<void>> {
  await mkdir(path.dirname(outJsonl), { recursive: true });

  // Gracefully handle the case where Cursor hasn't created its log dir yet.
  try {
    await stat(logDir);
  } catch {
    logger.warn({ logDir }, "log-scraper: log directory does not exist yet; returning no-op stopper");
    return async () => { /* no-op */ };
  }

  const offsets = new Map<string, number>();

  const processFile = async (filePath: string): Promise<void> => {
    const fileStat = await stat(filePath).catch(() => null);
    if (!fileStat) return;

    const prevOffset = offsets.get(filePath) ?? 0;
    const newSize = fileStat.size;

    if (newSize <= prevOffset) {
      // File truncated (log rotation) — reset to start.
      offsets.set(filePath, 0);
      return;
    }

    const readStart = prevOffset;
    const readEnd = Math.min(newSize, prevOffset + MAX_READ_BYTES);

    const fd = await open(filePath, "r");
    try {
      const stream = fd.createReadStream({ start: readStart, end: readEnd - 1 });
      const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

      let bytesConsumed = readStart;
      for await (const line of rl) {
        bytesConsumed += Buffer.byteLength(line, "utf8") + 1; // +1 for newline
        if (matchRegex.test(line)) {
          const match: LogMatch = { ts: new Date().toISOString(), file: filePath, line };
          await appendFile(outJsonl, JSON.stringify(match) + "\n");
          logger.debug(match, "log-scraper: match");
        }
      }

      offsets.set(filePath, readEnd);
    } finally {
      await fd.close();
    }
  };

  const watcher = chokidar.watch(`${logDir}/**/*.log`, {
    persistent: true,
    ignoreInitial: false,
    awaitWriteFinish: false,
  });

  watcher
    .on("add", (p) => void processFile(p))
    .on("change", (p) => void processFile(p))
    .on("error", (e) => logger.error({ err: e }, "log-scraper error"));

  logger.info({ logDir, outJsonl }, "log-scraper: started");

  return async () => {
    await watcher.close();
    logger.info({ logDir }, "log-scraper: stopped");
  };
}
