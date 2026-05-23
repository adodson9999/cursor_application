import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import process from "node:process";

import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
  TestStep,
} from "@playwright/test/reporter";

import { type BugContext, renderBugMarkdown } from "./bug-md.js";
import { appendBug } from "./voc-jsonl.js";

/** Playwright reporter that emits a Markdown bug report for every non-passing test. */
export default class BugReporter implements Reporter {
  onBegin(_config: FullConfig, _suite: Suite): void {
    /* intentionally empty */
  }

  async onTestEnd(test: TestCase, result: TestResult): Promise<void> {
    if (result.status === "passed" || result.status === "skipped") return;
    const ctx = this.buildContext(test, result);
    const out = `reports/auto/bug-${Date.now()}-${test.id.replace(/[^a-z0-9]/gi, "_").slice(0, 60)}.md`;
    await mkdir("reports/auto", { recursive: true });
    await writeFile(out, renderBugMarkdown(ctx));
    await appendBug(ctx);
  }

  onEnd(_result: FullResult): void {
    /* intentionally empty */
  }

  private buildContext(test: TestCase, result: TestResult): BugContext {
    // Pull observer artefact paths off result.attachments by name convention.
    const artefacts = Object.fromEntries(
      result.attachments.map((a) => [a.name, a.path]),
    );

    // Flatten test step titles as repro steps (only leaf steps).
    const steps = this.collectStepTitles(result.steps);

    const error = result.errors[0];
    const screenshot = result.attachments.find((a) => a.contentType === "image/png")?.path;
    const trace = result.attachments.find((a) => a.name === "trace")?.path;

    return {
      testTitle: test.title,
      testFile: test.location.file,
      testId: test.id,
      status: result.status as BugContext["status"],
      error: {
        message: error?.message ?? "(no error message)",
        ...(error?.stack ? { stack: error.stack } : {}),
      },
      durationMs: result.duration,
      startedAt: new Date(result.startTime).toISOString(),
      cursorVersion: process.env["CURSOR_VERSION"] ?? "unknown",
      cursorPath: process.env["CURSOR_APP_PATH"] ?? "/Applications/Cursor.app",
      observerArtefacts: {
        ...(artefacts["fs-watch"] ? { fsWatch: artefacts["fs-watch"] } : {}),
        ...(artefacts["mitm-flow"] ? { mitmFlow: artefacts["mitm-flow"] } : {}),
        ...(artefacts["perf-sample"] ? { perfSample: artefacts["perf-sample"] } : {}),
        ...(artefacts["heap-snapshot"] ? { heapSnapshot: artefacts["heap-snapshot"] } : {}),
        ...(artefacts["log-scrape"] ? { logScrape: artefacts["log-scrape"] } : {}),
        ...(screenshot ? { screenshot } : {}),
        ...(trace ? { trace } : {}),
      },
      reproSteps: steps,
    };
  }

  private collectStepTitles(steps: TestStep[], depth = 0): string[] {
    if (depth > 5) return [];
    const titles: string[] = [];
    for (const step of steps) {
      if (step.category === "test.step") titles.push(step.title);
      titles.push(...this.collectStepTitles(step.steps, depth + 1));
    }
    return titles;
  }
}
