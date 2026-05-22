import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from "@playwright/test/reporter";

import { BugContext, renderBugReport } from "./bug-md.js";
import { appendBugEvent } from "./voc-jsonl.js";

const REPORTS_DIR = path.resolve("reports/auto");

/** Playwright reporter that emits a Markdown bug report for every non-passing test. */
export default class PlaywrightBugReporter implements Reporter {
  onBegin(_config: FullConfig, _suite: Suite): void {
    // intentionally empty: no per-run setup needed
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    if (result.status === "passed" || result.status === "skipped") return;

    void this.writeBugReport(test, result);
  }

  onEnd(_result: FullResult): void {
    // intentionally empty
  }

  private async writeBugReport(
    test: TestCase,
    result: TestResult
  ): Promise<void> {
    await fs.mkdir(REPORTS_DIR, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const safeId = test.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 60);
    const reportPath = path.join(REPORTS_DIR, `bug-${timestamp}-${safeId}.md`);

    const error = result.errors[0];
    const ctx: BugContext = {
      testId: test.id,
      testTitle: test.title,
      testFile: test.location.file,
      status: result.status as BugContext["status"],
      errorMessage: error?.message ?? "(no error message)",
      errorStack: error?.stack,
      durationMs: result.duration,
      startedAt: new Date(result.startTime).toISOString(),
      observerArtifacts: {},
      env: {
        cursorVersion: process.env["CURSOR_VERSION"],
        nodeVersion: process.version,
        platform: os.platform(),
        arch: os.arch(),
      },
    };

    const markdown = renderBugReport(ctx);
    await fs.writeFile(reportPath, markdown, "utf8");
    await appendBugEvent(ctx);
  }
}
