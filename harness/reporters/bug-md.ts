export interface BugContext {
  testTitle: string;
  testFile: string;
  testId: string;
  status: "failed" | "timedOut" | "interrupted";
  error: { message: string; stack?: string };
  durationMs: number;
  startedAt: string;
  cursorVersion: string;
  cursorPath: string;
  observerArtefacts: {
    fsWatch?: string;
    mitmFlow?: string;
    perfSample?: string;
    heapSnapshot?: string;
    logScrape?: string;
    screenshot?: string;
    trace?: string;
  };
  reproSteps: string[];
}

/** Render a BugContext into the canonical Markdown body (docs/BUG_REPORT_TEMPLATE.md). */
export function renderBugMarkdown(ctx: BugContext): string {
  const steps = ctx.reproSteps.length > 0
    ? ctx.reproSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")
    : "1. (no repro steps recorded)";

  const evidenceRows = Object.entries({
    "fs-watch":       ctx.observerArtefacts.fsWatch,
    "mitm flow":      ctx.observerArtefacts.mitmFlow,
    "perf sample":    ctx.observerArtefacts.perfSample,
    "heap snapshot":  ctx.observerArtefacts.heapSnapshot,
    "log scrape":     ctx.observerArtefacts.logScrape,
    screenshot:       ctx.observerArtefacts.screenshot,
    trace:            ctx.observerArtefacts.trace,
  })
    .filter(([, v]) => v != null)
    .map(([k, v]) => `- ${k}: \`${v}\``)
    .join("\n");

  const stackSection = ctx.error.stack
    ? `\n<details><summary>Stack</summary>\n\n\`\`\`\n${ctx.error.stack}\n\`\`\`\n</details>\n`
    : "";

  return `# Bug — ${ctx.testTitle}

| field | value |
|---|---|
| test id | \`${ctx.testId}\` |
| file | \`${ctx.testFile}\` |
| status | **${ctx.status}** |
| duration | ${ctx.durationMs} ms |
| started | ${ctx.startedAt} |
| cursor | ${ctx.cursorVersion} at \`${ctx.cursorPath}\` |

## Reproduction steps

${steps}

## Failure

\`\`\`
${ctx.error.message}
\`\`\`
${stackSection}
## Evidence

${evidenceRows || "_No observer artefacts attached._"}

## Severity (rubric: docs/SEVERITY_RUBRIC.md)

*To be triaged on file review.*

## Environment

- macOS: $(sw_vers -productVersion)
- arch: $(uname -m)
- node: $(node --version)
- generated: ${new Date().toISOString()}
`;
}
