import fs from "node:fs/promises";
import path from "node:path";

import chokidar from "chokidar";

import { logger } from "../util/logger.js";

export interface FsEvent {
  event: "add" | "change" | "unlink";
  filePath: string;
  ts: string;
}

/** Watch a directory tree and record add/change/unlink events to a JSONL file. */
export function watchDir(
  watchPath: string,
  outJsonl: string
): () => Promise<void> {
  const watcher = chokidar.watch(watchPath, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 50 },
  });

  const appendEvent = async (event: FsEvent): Promise<void> => {
    await fs.appendFile(outJsonl, JSON.stringify(event) + "\n", "utf8");
    logger.debug(event, "fs-watch event");
  };

  const handler =
    (event: "add" | "change" | "unlink") =>
    (filePath: string): void => {
      const record: FsEvent = {
        event,
        filePath: path.resolve(filePath),
        ts: new Date().toISOString(),
      };
      void appendEvent(record);
    };

  watcher.on("add", handler("add"));
  watcher.on("change", handler("change"));
  watcher.on("unlink", handler("unlink"));

  watcher.on("error", (err: unknown) => {
    logger.error({ err }, "fs-watch error");
  });

  logger.info({ watchPath, outJsonl }, "fs-watch started");

  return async () => {
    await watcher.close();
    logger.info({ watchPath }, "fs-watch stopped");
  };
}
