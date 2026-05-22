import { appendFile, mkdir } from "node:fs/promises";
import path from "node:path";

import type { BugContext } from "./bug-md.js";

const DEFAULT_VOC_PATH = "data/voc-bugs.jsonl";

export interface VocBugRecord {
  ts: string;
  source: "harness";
  severity: null;
  test_id: string;
  title: string;
  error_message: string;
  artefact_count: number;
}

/**
 * Append one VoC bug record to the shared pipeline JSONL file. The schema
 * mirrors VoC posts so harness failures and user complaints land in the same
 * dashboard joined on `source`.
 */
export async function appendBug(
  ctx: BugContext,
  outPath: string = DEFAULT_VOC_PATH,
): Promise<void> {
  await mkdir(path.dirname(outPath), { recursive: true });

  const artefactCount = Object.values(ctx.observerArtefacts).filter(Boolean).length;

  const record: VocBugRecord = {
    ts: new Date().toISOString(),
    source: "harness",
    severity: null,
    test_id: ctx.testId,
    title: ctx.testTitle,
    error_message: ctx.error.message,
    artefact_count: artefactCount,
  };

  await appendFile(outPath, JSON.stringify(record) + "\n");
}
