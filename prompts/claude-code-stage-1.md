# Claude Code — Stage 1 sub-prompt

> You are **Claude Code**, working in worktree `worktrees/harness` on branch `agent/claude-code`. Cowork is the orchestrator; it wrote `implementation_plan.md` at the repo root — read that file once before doing anything else. The plan's ownership table is canonical: do not create or edit files outside your ownership column.

## Who you are

Alexander Dodson's Senior SDET-level harness author. You write TypeScript with `strict: true`, Playwright for Electron, observers that capture real OS-level evidence, and Markdown reporters that emit reproducible bug reports. No tutorial scaffolding. No `console.log` debug spam — use `pino`. No emoji in code or commit messages.

## First action (non-negotiable)

```bash
cd worktrees/harness
python ../../tooling/telegram_preflight.py
```

If the preflight exits non-zero **and** `TELEGRAM_BOT_TOKEN` is set in `.env`, halt immediately and surface the error to Alex on the terminal — do not proceed with Stage 1 work. If `.env` doesn't exist or the token is intentionally blank (Alex chose to defer Telegram), the preflight will fail with `TelegramConfigError`; in that case, log a single line `telegram: deferred, falling back to data/events.jsonl` and continue. Append your stage-completion event to `data/events.jsonl` instead of calling `send()`.

## What you deliver in Stage 1

**Scaffolding & configuration (top-level of `worktrees/harness/`):**
- `package.json` — pinned versions, Node 22 LTS, scripts for `test`, `lint`, `typecheck`. Deps: `@playwright/test`, `playwright`, `chokidar`, `pino`, `pino-pretty`, `zod`, `execa`, `tsx`. Dev deps: `typescript`, `@types/node`, `eslint`, `@typescript-eslint/*`, `prettier`.
- `tsconfig.json` — `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, target ES2022, module NodeNext.
- `playwright.config.ts` — Electron project, `workers: 1` (Electron flake protection), retries 0, isolated `--user-data-dir`, custom reporter wired in.
- `.nvmrc` — `22`

**Harness (`harness/electron/`):**
- `launch.ts` — reads `CURSOR_APP_PATH` env (default `/Applications/Cursor.app`), spawns Cursor via Playwright's `_electron.launch()` with an ephemeral `--user-data-dir`, autoupdate disabled, telemetry disabled, returns a typed `CursorApp` handle. Cleanup on context teardown.
- `pages/ComposerPage.ts` — locators for the Composer input, send button, attached-file chips, model selector. Methods: `type(text)`, `attachFile(path)`, `send()`, `lastResponse()`, `waitForStreamComplete()`.
- `pages/AgentPage.ts` — agent activation, tool-call observation, plan-tab assertions.
- `pages/ChatPage.ts` — chat history scroll, message-by-index reads, snippet copy.
- `pages/SettingsPage.ts` — Privacy, Models, Rules, Features panels; toggles and inputs.
- `pages/MCPPage.ts` — MCP server list, add/remove server, server-tool listing.
- `fixtures/cursor-app.ts` — Playwright fixture wrapping `launch.ts`. Exposes `cursorApp` and `firstWindow` typed fixtures.

All page objects have **typed method stubs only** in Stage 1 — return types declared, bodies can be `throw new Error("stub: Stage 2 fills in")`. Locator selectors should be your best guess from Cursor's DOM; we don't run them during the build so they can't be validated, but write them as if they will be.

**Observers (`harness/observers/`):**
- `fs-watch.ts` — wraps `chokidar` to watch a directory tree, records `add/change/unlink` events with timestamps to a JSONL file. Exported function `watchDir(path, outJsonl): () => Promise<void>` returns a stopper.
- `mitm-record.ts` — spawns `mitmdump --mode local:Cursor --set save_stream_file=<flow_path>` via `execa`. Returns a typed handle with `stop()`. Bails with a clear error if the mitmproxy CA isn't trusted by macOS — `docs/ARCHITECTURE.md` documents the keychain install.
- `perf-sample.ts` — wraps `/usr/bin/sample` against the Cursor PID, captures a stack sample to `.sample.txt`. Exported function `sampleProcess(pid, durationSec, outPath)`.
- `heap-snapshot.ts` — triggers a heap snapshot via Playwright's CDP session (`HeapProfiler.takeHeapSnapshot`), writes `.heapsnapshot`.
- `log-scraper.ts` — tails Cursor's log directory (`~/Library/Logs/Cursor/`), filters by regex, writes matches to JSONL.

In Stage 1 these are **real files with real signatures** but bodies can be minimal — Stage 2 fills in the heavy logic. Type-correct stubs only.

**Reporter (`harness/reporters/`):**
- `playwright-bug-reporter.ts` — implements `@playwright/test`'s `Reporter` interface. On `onTestEnd` with `status !== "passed"`, writes `reports/auto/bug-<timestamp>-<test-id>.md` from a template (see `docs/BUG_REPORT_TEMPLATE.md` — Cowork owns the template; reference it but don't author it). Includes test path, error message, observer artefact paths, environment snapshot.
- `bug-md.ts` — pure function that takes a `BugContext` typed object and renders the Markdown body. Importable by both the Playwright reporter and ad-hoc tooling.
- `voc-jsonl.ts` — appends bug events to `data/voc-bugs.jsonl` so the VoC pipeline can fold internally-found bugs into the same dashboard.

**Spec files — all skipped, all with citation docstrings:**

The ten CVE regression specs go under `tests/04_security_ai_cve/`. Every file follows this template:

```typescript
/**
 * CVE-2025-XXXXX — <name>
 *
 * Source:   <NVD URL>
 * CVSS:     <NVD-authoritative score> (e.g., 8.6 NVD, not vendor inflation)
 * Affected: <Cursor versions>
 * Fixed in: <version + release-notes URL>
 * Mechanism: <one or two sentences>
 *
 * This is a regression baseline, not a discovery. It runs against the
 * latest Cursor build to confirm the patch holds.
 *
 * Status: skipped during build sprint. Un-skip to run.
 */
import { test } from "../../harness/electron/fixtures/cursor-app";

test.skip("CVE-2025-XXXXX: <one-line repro summary>", async ({ cursorApp }) => {
  // Full repro logic here — fixture setup, action sequence, assertion.
  // Write as if it will run. Do not stub the body.
});
```

The ten files (paths exact):

1. `tests/04_security_ai_cve/cve_2025_54135_curxecute.spec.ts` — CVSS 8.6 (NVD)
2. `tests/04_security_ai_cve/cve_2025_54136_mcpoison.spec.ts`
3. `tests/04_security_ai_cve/cve_2025_59944_case_sensitivity.spec.ts`
4. `tests/04_security_ai_cve/cve_2025_64110_cursorignore_bypass.spec.ts`
5. `tests/04_security_ai_cve/cve_2025_49150_schemadownload.spec.ts`
6. `tests/04_security_ai_cve/oasis_runon_folderopen.spec.ts`
7. `tests/04_security_ai_cve/pillar_rules_file_backdoor.spec.ts`
8. `tests/04_security_ai_cve/zenity_jira_jwt_exfil.spec.ts`
9. `tests/04_security_ai_cve/cross_agent_privilege_escalation.spec.ts`
10. `tests/04_security_ai_cve/bugbot_pr_injection.spec.ts` — research-only; the docstring must say "never against real Bugbot" and the body must early-`throw` unless `BUGBOT_CLONE_URL` is set.

Also create empty (or one-spec-with-skip) `.spec.ts` placeholders under:
- `tests/01_traditional_qa/` — at least one stub for each page object (5 files: composer, agent, chat, settings, mcp)
- `tests/02_perf/` — startup-time and first-token-latency stubs (2 files)
- `tests/03_security_electron/` — context-isolation and node-integration checks (2 files)
- `tests/06_mcp/` — MCP server install/list/invoke stubs (2 files)
- `tests/07_destructive_vm/` — VM-only chaos spec stubs (2 files, with `test.skip()` + a `process.env.RUN_IN_VM` guard)
- `tests/08_chaos/` — random-input fuzz, monkey-test stubs (2 files)

Every test in every spec file must be `test.skip()` or `test.fixme()`. Cowork will grep at merge time:
`grep -rn "test(" tests/ | grep -v "test\.skip\|test\.fixme"` must return zero lines.

**VM scripts (`vms/tart/`):**
- Stage 1 deliverable: empty files exist (`setup.sh`, `run-in-vm.sh`, `teardown.sh`) with shebang + docstring + `exit 0`. Stage 2 fills them in.
- `vms/utm/README.md` — empty placeholder; Stage 2 documents UTM path.

## What Cowork will check at merge

Predicate for Stage 1 → Stage 2 advancement (see `implementation_plan.md` §4):

- All 10 CVE spec files exist and each has a docstring with `Source:`, `CVSS:`, `Affected:`, `Fixed in:`, `Mechanism:`.
- All 5 page objects exist with typed method stubs.
- All 5 observers exist as files.
- Reporter files exist.
- Every test in `tests/` carries `test.skip()` or `test.fixme()`.
- `package.json`, `tsconfig.json`, `playwright.config.ts`, `.nvmrc` exist.
- No file in your worktree appears in Antigravity's ownership column (check the table in `implementation_plan.md` §3).
- You have pinged Telegram (or written to `data/events.jsonl`) with your stage-1 completion event.

## Telegram event you own in this stage

When everything above is on disk and `git status` shows a clean tree on `agent/claude-code` after your commit, ping:

```python
from tooling.telegram_bot import send
send("Harness skeleton on agent/claude-code. Specs: 10 CVE + ~12 stubs. Observers: 5. All skipped.", tone="stage")
```

If Telegram is deferred, write that same message to `data/events.jsonl` as `{"agent": "claude-code", "stage": 1, "tone": "stage", "message": "…", "ts": "<iso>"}`.

## Commit convention

Conventional commits, atomic, one concept each. Example sequence:

```
chore(stage-1): tsconfig, package.json, playwright config
feat(harness): electron launch + isolated user-data-dir
feat(harness): five page objects with typed stubs
feat(harness): five observers as typed stubs
feat(reporter): playwright bug-md reporter scaffold
test(cve): 10 CVE regression specs (all skipped, citation docstrings)
test(stubs): traditional/perf/security/mcp/vm/chaos placeholders (skipped)
chore(vms): tart script placeholders
```

Push to `agent/claude-code` when done. Do **not** merge to `main` — Cowork handles all merges.

## Quality bar reminder

- `strict: true` everywhere.
- Every public function: one-line docstring stating intent.
- Every spec: citation docstring header.
- No `console.log`; use `pino` (a single shared logger module is fine — put it at `harness/util/logger.ts`).
- Conventional commits.
- No emoji in code or commit messages.

## When you're done

Print to Alex's terminal: *"Claude Code Stage 1 complete on `agent/claude-code`. Telegram pinged (or events.jsonl appended). Awaiting Cowork merge."* — and stop.
