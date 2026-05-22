import fs from "node:fs/promises";
import path from "node:path";

import { BugContext } from "./bug-md.js";

export interface VocBugEvent {
  agent: "claude-code";
  source: "harness-test-failure";
  testId: string;
  testTitle: string;
  status: string;
  errorMessage: string;
  ts: string;
}

/** Append a test-failure bug event to the VoC JSONL pipeline file. */
export async function appendBugEvent(
  ctx: BugContext,
  outPath: string = "data/voc-bugs.jsonl"
): Promise<void> {
  const record: VocBugEvent = {
    agent: "claude-code",
    source: "harness-test-failure",
    testId: ctx.testId,
    testTitle: ctx.testTitle,
    status: ctx.status,
    errorMessage: ctx.errorMessage,
    ts: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.appendFile(outPath, JSON.stringify(record) + "\n", "utf8");
}
