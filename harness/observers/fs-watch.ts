import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import chokidar from "chokidar";

import { logger } from "../util/logger.js";

export interface FsEvent {
  ts: string;
  kind: "add" | "change" | "unlink" | "addDir" | "unlinkDir";
  path: string;
  size?: number;
}

/**
 * Watch a directory tree and append add/change/unlink/addDir/unlinkDir events
 * to a JSONL file. Returns a stopper that cleanly closes the watcher.
 */
export async function watchDir(
  watchPath: string,
  outJsonl: string,
  opts: { ignoreInitial?: boolean } = {},
): Promise<() => Promise<void>> {
  await mkdir(dirname(outJsonl), { recursive: true });

  const watcher = chokidar.watch(watchPath, {
    ignoreInitial: opts.ignoreInitial ?? true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 50 },
  });

  const write = async (
    kind: FsEvent["kind"],
    p: string,
    stats?: { size: number },
  ): Promise<void> => {
    const event: FsEvent = {
      ts: new Date().toISOString(),
      kind,
      path: p,
      ...(stats ? { size: stats.size } : {}),
    };
    await appendFile(outJsonl, JSON.stringify(event) + "\n");
    logger.debug(event, "fs-watch event");
  };

  watcher
    .on("add", (p, s) => void write("add", p, s ? { size: s.size } : undefined))
    .on("change", (p, s) => void write("change", p, s ? { size: s.size } : undefined))
    .on("unlink", (p) => void write("unlink", p))
    .on("addDir", (p) => void write("addDir", p))
    .on("unlinkDir", (p) => void write("unlinkDir", p))
    .on("error", (e) => logger.error({ err: e }, "fs-watch error"));

  logger.info({ watchPath, outJsonl }, "fs-watch started");

  return async () => {
    await watcher.close();
    logger.info({ watchPath }, "fs-watch stopped");
  };
}
