import { writeFile } from "node:fs/promises";

import { Page } from "@playwright/test";

import { logger } from "../util/logger.js";

/**
 * Trigger a V8 heap snapshot via Playwright's CDP session and write the
 * result to outPath (typically ending in .heapsnapshot).
 */
export async function takeHeapSnapshot(page: Page, outPath: string): Promise<void> {
  logger.info({ outPath }, "heap-snapshot: starting");

  const session = await page.context().newCDPSession(page);
  const chunks: string[] = [];

  session.on("HeapProfiler.addHeapSnapshotChunk", (e: { chunk: string }) => {
    chunks.push(e.chunk);
  });

  await session.send("HeapProfiler.takeHeapSnapshot", { reportProgress: false });
  await writeFile(outPath, chunks.join(""));
  await session.detach();

  logger.info({ outPath, bytes: chunks.join("").length }, "heap-snapshot: written");
}
