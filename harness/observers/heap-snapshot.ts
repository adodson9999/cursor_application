import fs from "node:fs/promises";

import { CDPSession, Page } from "@playwright/test";

import { logger } from "../util/logger.js";

/**
 * Trigger a V8 heap snapshot via Playwright's CDP session and write the
 * result to outPath (typically ending in .heapsnapshot).
 */
export async function takeHeapSnapshot(
  page: Page,
  outPath: string
): Promise<void> {
  logger.info({ outPath }, "heap-snapshot: starting");

  const cdp: CDPSession = await page.context().newCDPSession(page);

  const chunks: string[] = [];

  cdp.on(
    "HeapProfiler.addHeapSnapshotChunk",
    (params: { chunk: string }) => {
      chunks.push(params.chunk);
    }
  );

  await cdp.send("HeapProfiler.takeHeapSnapshot", {
    reportProgress: false,
    captureNumericValue: false,
  });

  await cdp.detach();

  await fs.writeFile(outPath, chunks.join(""), "utf8");
  logger.info({ outPath, sizeBytes: chunks.join("").length }, "heap-snapshot: written");
}
