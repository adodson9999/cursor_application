# Implementation Plan — Cursor PQE Bug-Hunting Harness

> Canonical source of truth for the entire build sprint. Cowork maintains this file. Claude Code and Antigravity read it before every action. If the plan and the code disagree, the plan wins until Cowork updates it.

---

## 1. Goal statement

A hiring manager evaluating a Product Quality Engineer application opens this repo, spends ninety seconds in it, and concludes that the candidate has already done Week 1 of the job. The artifact is a local, fully-Apple-Silicon-native Cursor bug-hunting harness that pairs traditional Electron QA automation, a current AI-specific CVE regression battery, a red-team prompt-injection matrix, an end-to-end Voice-of-Customer pipeline, and an honest, written-down architecture. Nothing in the repo is theoretical: every spec is real code with citation-anchored docstrings, every observer is wired to a real source of evidence, and every report template renders. The only thing that doesn't run during the build is the test execution itself — that is preserved as a one-command capability the hiring manager can trigger themselves.

## 2. Architecture overview

The harness is structured as four concentric capability rings around a Cursor process running under instrumentation. The innermost ring is **traditional QA** — Playwright driving the Electron renderer, page objects for Composer / Agent / Chat / Settings / MCP, file-system and network observers capturing side-effects, a custom reporter that emits Markdown bug reports the moment a spec fails. The second ring is **AI-specific regression** — ten Playwright specs that reproduce known patched CVEs (CurXecute, MCPoison, case-sensitivity bypass, `.cursorignore` bypass, schema-download RCE, run-on-folder-open, Pillar Rules-File backdoor, Zenity Jira JWT exfil, cross-agent privilege escalation, Bugbot PR injection), each with NVD-authoritative scoring and a fix-version citation. The third ring is **red-team** — a 9×5 prompt-injection corpus (nine attack categories × five sophistication levels = 45 payloads), three malicious-MCP server skeletons (Slack-clone, Jira-clone, GitHub-clone), and Python wrappers around garak, DeepTeam, Inspect AI, and PyRIT. The fourth ring is **destructive isolation** — Tart (Apple Silicon-native) and UTM VM scripts that let the chaos specs run against an expendable copy of macOS.

Surrounding the harness is the **Voice-of-Customer pipeline**, which is independent of the test layer: a polite scraper hits public sources (forum.cursor.com RSS, Reddit JSON, HN Algolia, public GitHub issues), classifies posts with a local Llama-3.1-8B via Ollama, clusters by embedding, persists into a local Postgres, and renders a weekly Markdown + PDF synthesis via Metabase and ReportLab. The whole assembly is orchestrated by a `Makefile` with discrete waves (`wave1`, `wave2`, `wave3`, `voc`, `demo`, `pdf`) so the hiring manager can pull on a single thread without firing the whole loom. During the build itself, only `make setup` and `make pdf` execute — everything else is written and skipped.

```
┌─────────────────────────────────────────────────────────────────────────┐
│  VoC pipeline (ingest → classify → cluster → dashboard → weekly PDF)    │
│                                  │                                       │
│  ┌───────────────────────────────┴───────────────────────────────────┐  │
│  │                                                                   │  │
│  │   Ring 4 — destructive isolation (Tart / UTM macOS VMs)           │  │
│  │   ┌─────────────────────────────────────────────────────────┐     │  │
│  │   │  Ring 3 — red team (45-payload matrix, malicious MCPs)  │     │  │
│  │   │  ┌────────────────────────────────────────────────────┐ │     │  │
│  │   │  │  Ring 2 — AI CVE regression battery (10 specs)     │ │     │  │
│  │   │  │  ┌───────────────────────────────────────────────┐ │ │     │  │
│  │   │  │  │  Ring 1 — traditional QA                       │ │ │     │  │
│  │   │  │  │  ┌──────────────────────────────────────┐     │ │ │     │  │
│  │   │  │  │  │  CURSOR  (--user-data-dir isolated)  │     │ │ │     │  │
│  │   │  │  │  └──────────────────────────────────────┘     │ │ │     │  │
│  │   │  │  │   Playwright + page objects + observers       │ │ │     │  │
│  │   │  │  └───────────────────────────────────────────────┘ │ │     │  │
│  │   │  └────────────────────────────────────────────────────┘ │     │  │
│  │   └─────────────────────────────────────────────────────────┘     │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  Observers (fs-watch · mitm-record · perf-sample · heap · log)           │
│  Reporter  → Markdown bug report + VoC JSONL                             │
└─────────────────────────────────────────────────────────────────────────┘
```

## 3. Agent assignments (ownership table)

Every file in the repo belongs to exactly one of three owners. Worktrees enforce this physically. If two agents need to touch the same file, that's a Cowork decision and the plan changes before the code does.

| Path | Owner | Worktree | Branch |
|---|---|---|---|
| `README.md` | **Cowork** | (main) | `main` |
| `implementation_plan.md` | **Cowork** | (main) | `main` |
| `.env.example`, `.gitignore`, `bootstrap.sh` | **Cowork** | (main) | `main` |
| `Makefile`, `docker-compose.yml` | **Cowork** | (main) | `main` |
| `tooling/telegram_bot.py` | **Cowork** | (main) | `main` |
| `tooling/telegram_preflight.py` | **Cowork** | (main) | `main` |
| `prompts/*.md` (per-stage agent sub-prompts) | **Cowork** | (main) | `main` |
| `docs/*` | **Cowork** | (main) | `main` |
| `voc/ingest/*` | **Cowork** | (main) | `main` |
| `voc/dashboard/*` | **Cowork** | (main) | `main` |
| `voc/reports/*` | **Cowork** | (main) | `main` |
| `voc/sample/*` | **Cowork** | (main) | `main` |
| `reports/*` | **Cowork** | (main) | `main` |
| `package.json`, `tsconfig.json`, `playwright.config.ts` | **Claude Code** | `worktrees/harness` | `agent/claude-code` |
| `harness/electron/launch.ts` | **Claude Code** | `worktrees/harness` | `agent/claude-code` |
| `harness/electron/pages/*` (5 page objects) | **Claude Code** | `worktrees/harness` | `agent/claude-code` |
| `harness/electron/fixtures/*` | **Claude Code** | `worktrees/harness` | `agent/claude-code` |
| `harness/observers/*` (5 observers) | **Claude Code** | `worktrees/harness` | `agent/claude-code` |
| `harness/reporters/*` | **Claude Code** | `worktrees/harness` | `agent/claude-code` |
| `tests/01_traditional_qa/*` | **Claude Code** | `worktrees/harness` | `agent/claude-code` |
| `tests/02_perf/*` | **Claude Code** | `worktrees/harness` | `agent/claude-code` |
| `tests/03_security_electron/*` | **Claude Code** | `worktrees/harness` | `agent/claude-code` |
| `tests/04_security_ai_cve/*` (10 CVE specs) | **Claude Code** | `worktrees/harness` | `agent/claude-code` |
| `tests/06_mcp/*` | **Claude Code** | `worktrees/harness` | `agent/claude-code` |
| `tests/07_destructive_vm/*` | **Claude Code** | `worktrees/harness` | `agent/claude-code` |
| `tests/08_chaos/*` | **Claude Code** | `worktrees/harness` | `agent/claude-code` |
| `vms/tart/*` | **Claude Code** | `worktrees/harness` | `agent/claude-code` |
| `vms/utm/README.md` | **Claude Code** | `worktrees/harness` | `agent/claude-code` |
| `pyproject.toml` | **Antigravity** | `worktrees/redteam` | `agent/antigravity` |
| `corpora/prompt_injection/*` (45 payloads) | **Antigravity** | `worktrees/redteam` | `agent/antigravity` |
| `corpora/unicode_bidi/*` | **Antigravity** | `worktrees/redteam` | `agent/antigravity` |
| `corpora/slopsquatting/*` | **Antigravity** | `worktrees/redteam` | `agent/antigravity` |
| `corpora/jailbreaks/*` | **Antigravity** | `worktrees/redteam` | `agent/antigravity` |
| `malicious_mcp/slack_clone/*` | **Antigravity** | `worktrees/redteam` | `agent/antigravity` |
| `malicious_mcp/jira_clone/*` | **Antigravity** | `worktrees/redteam` | `agent/antigravity` |
| `malicious_mcp/github_clone/*` | **Antigravity** | `worktrees/redteam` | `agent/antigravity` |
| `tests/05_redteam_ai/*` | **Antigravity** | `worktrees/redteam` | `agent/antigravity` |
| `voc/classify/*` (LLM classifier + clustering) | **Antigravity** | `worktrees/redteam` | `agent/antigravity` |

**Rationale.** Claude Code gets the TypeScript / Playwright / Node / Electron / macOS-shell territory because that is where it consistently produces clean, strict-typed, well-instrumented output. Antigravity gets the Python red-team frameworks, the LLM eval harnesses, and the corpora curation because that work benefits from its interactive review surface — Antigravity is better at "show me the 45 generated payloads in a grid before I commit them." Cowork takes the orchestration metal, the Telegram library, the VoC ingest plumbing, all docs, and the final hiring-manager-facing polish, because those need a single editorial voice and steady stewardship of the plan.

## 4. Stage gates

Each stage advances only when its gate predicate is `true`. Cowork verifies the predicate by direct inspection of the merged trunk — never by trusting an agent's status message.

### Stage 0 — Planning (Cowork only)
- [x] `implementation_plan.md` exists, committed on `main`
- [ ] `bootstrap.sh` exists, executable
- [ ] `tooling/telegram_bot.py` library committed on `main`
- [ ] `tooling/telegram_preflight.py` committed on `main`
- [ ] `.env.example` and `.gitignore` committed on `main`
- [ ] Worktrees created (via `bootstrap.sh`, run once by Alex)
- [ ] Cowork prints Stage 0 status line to terminal and **stops**, awaiting Alex's go-ahead

### Stage 1 — Skeleton (Claude Code + Antigravity, parallel)
Predicate to advance:
- Every spec file under `tests/01_*`, `tests/02_*`, `tests/03_*`, `tests/04_*`, `tests/05_*`, `tests/06_*`, `tests/07_*`, `tests/08_*` exists and is marked `test.skip()` / `test.fixme()` / `@pytest.mark.skip`
- All ten CVE spec files exist with citation docstrings
- Five page objects exist with typed method stubs
- Five observers exist as files (logic can be stubbed; Stage 2 fills in)
- 45 prompt-injection payload files exist under `corpora/prompt_injection/`
- Three malicious-MCP server skeletons exist (no real exfil endpoints; fixture data only)
- Custom Playwright reporter file exists
- Both agents have pinged Telegram with their Stage 1 completion message
- `grep -rn "test(" tests/ | grep -v "test\.skip\|test\.fixme" | wc -l` returns `0`

### Stage 2 — Internals & VoC (all three roles)
Predicate to advance:
- Observers contain real logic, not stubs (Claude Code)
- Custom reporter produces an actual Markdown bug report from a contrived failure fixture (Claude Code)
- Tart VM scripts present and shell-checked (Claude Code)
- garak / DeepTeam / Inspect AI / PyRIT wrappers present, still skipped (Antigravity)
- Ollama-backed classifier exists, severity scorer exists, embedding cluster module exists (Antigravity)
- VoC scrapers exist (Cowork)
- Postgres + Metabase compose file + schema + question pack exist (Cowork)
- ReportLab PDF generator exists (Cowork)
- `Makefile` exists with all documented targets (Cowork)
- Both agents have pinged Telegram with Stage 2 completion

### Stage 3 — Polish & Artifact (Cowork-led)
Predicate to advance:
- `README.md` is in the hiring-manager voice (see §10 README VOICE in master prompt)
- `docs/WEEK_1_PLAN.md`, `docs/DEMO_NARRATIVE.md`, `docs/ARCHITECTURE.md`, `docs/SEVERITY_RUBRIC.md`, `docs/BUG_REPORT_TEMPLATE.md`, `docs/VOC_WEEKLY_TEMPLATE.md` all exist and polished
- `voc/sample/*.jsonl` contains ~30 hand-crafted realistic posts
- `make pdf` has executed once against the sample data and `reports/week_1_voc_synthesis.pdf` is on disk
- `v1.0-hiring-manager` tag created on `main`
- Claude Code has fired `demo_ready`, `pdf_ready`, `v1_tagged` Telegram messages in that order

## 5. Merge protocol

After each stage, Cowork merges in this order:

1. Verify `agent/claude-code` is committed and pushed to its worktree branch.
2. Verify `agent/antigravity` is committed and pushed to its worktree branch.
3. From the trunk checkout, `git merge --ff-only agent/claude-code` if possible, else `git merge --no-ff agent/claude-code -m "merge(stage-N): claude-code"`.
4. Same for `agent/antigravity`.
5. If there is a merge conflict, **Cowork resolves it** by editing on `main`. The agents do not see the conflict. Cowork records the resolution in a short note at `docs/MERGE_NOTES.md`.
6. Cowork re-runs the stage-gate predicate against the merged trunk.
7. If the predicate fails, Cowork sends the responsible agent back to its worktree with a corrective sub-prompt. Stage does not advance.

## 6. Telegram event ownership

Cowork sends zero Telegram messages. The library exists for the two coding agents. The pre-flight is run by the agents as the first action in their worktree.

| Event | Owner | Tone | Library call |
|---|---|---|---|
| Stage 1 — Claude Code's harness slice done | Claude Code | `stage` | `send("Harness skeleton on agent/claude-code. Specs: 10. Observers: 5. All skipped.", tone="stage")` |
| Stage 1 — Antigravity's red-team slice done | Antigravity | `stage` | `send("Red-team corpora on agent/antigravity. Payloads: 45. MCP servers: 3.", tone="stage")` |
| Stage 2 — Claude Code's internals done | Claude Code | `stage` | `send("Observers live. VM scripts ready. Branch: agent/claude-code.", tone="stage")` |
| Stage 2 — Antigravity's eval wrappers done | Antigravity | `stage` | `send("Eval wrappers and classifier live. Branch: agent/antigravity.", tone="stage")` |
| `make demo` runnable end-to-end | Claude Code | `demo_ready` | `send("`make demo` will walk a hiring manager through the harness.", tone="demo_ready")` |
| PDF rendered | Claude Code | `pdf_ready` | `send("Week-1 synthesis at reports/week_1_voc_synthesis.pdf.", tone="pdf_ready")` |
| Tag created | Claude Code | `v1_tagged` | `send("Go land the job.", tone="v1_tagged")` |

The library prepends a tone-specific opener so the four message types have visibly different sentence rhythms even before the agent's message body:

- `stage` → `"Status: "` (one word, colon, clipped)
- `demo_ready` → `"Demo path live. "` (short declarative preamble)
- `pdf_ready` → `"The artifact is on disk. "` (slight exhale)
- `v1_tagged` → `"v1.0-hiring-manager. The build is done. "` (two-sentence closer)

## 7. Token budget

Rough per-stage agent-message accounting. Cowork enforces the budget by halting a stage and re-sub-prompting if an agent exceeds its allocation.

| Stage | Cowork | Claude Code | Antigravity | Notes |
|---|---:|---:|---:|---|
| 0 | ~40 | 0 | 0 | This current execution |
| 1 | ~30 (sub-prompts + merge) | ~100 | ~80 | Most files in this stage are templated |
| 2 | ~80 (VoC pipeline) | ~140 | ~120 | Observer internals + classifier are the heaviest |
| 3 | ~120 (docs + PDF + tag) | ~30 (closing pings) | 0 | Cowork-dominated stage |
| **Total** | **~270** | **~270** | **~200** | **~740 total** |

20% buffer assumed. If any agent crosses 1.2× its allocation, Cowork investigates whether the partition is wrong before throwing more tokens at the symptom.

## 8. Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | Playwright Electron flake against Cursor's auto-update | Medium | Medium | Tests skipped during build; when run, isolated `--user-data-dir` + autoupdate disabled via env. Document Cursor version pinning in `docs/ARCHITECTURE.md`. |
| R2 | MCP server install friction across Node versions | Low | Medium | Pin Node 22 LTS in `.nvmrc`. Lock dependency versions in `package.json`. |
| R3 | Ollama model footprint (~5 GB for Llama-3.1-8B) | High | Low | Document disk requirement in README quickstart. Allow Phi-3.5-mini fallback (~2 GB) via `OLLAMA_MODEL` env var. |
| R4 | mitmproxy CA trust on macOS Sequoia | Medium | Medium | Document one-line keychain install in `docs/ARCHITECTURE.md`. Tests that need the CA gate themselves on its presence. |
| R5 | CVE fabrication / hallucinated scoring | Low (if disciplined) | High | Every CVE spec docstring must cite NVD URL and fix-version source. Cowork greps for any spec without a citation block before tagging v1.0. |
| R6 | Workspace shell unavailability blocks Cowork's git ops | **Materialized** | Medium | Adapted: `bootstrap.sh` does the git init + worktrees in one command, run once by Alex. |
| R7 | Token budget overrun | Low | High | Per-stage allocation in §7; Cowork halts and re-partitions before throwing more tokens. |
| R8 | Telegram silent failure (bad token, blocked chat) | Medium | Low | `telegram_preflight.py` is the first action in every agent worktree session; halt-and-report on failure. |
| R9 | Cursor app path varies across installs | Low | Low | `harness/electron/launch.ts` reads `CURSOR_APP_PATH` env with `/Applications/Cursor.app` default. |
| R10 | Bugbot PR injection spec accidentally hits real Bugbot | Low | High | Spec docstring + `test.skip()` plus a defensive guard that aborts unless `BUGBOT_CLONE_URL` env points at the local clone. |
| R11 | Ollama not installed on Alex's Mac | Medium | Low | `make setup` checks for `ollama` binary, prints a one-line install hint (`brew install ollama && ollama pull llama3.1:8b`) on failure. |
| R12 | UTM and Tart users get different experience | Low | Low | Tart gets executable scripts (Apple Silicon native, faster); UTM gets a documented README path. Both honored, neither blocks the other. |

## 9. Open questions for Alex

These are decisions Cowork needs from Alex before or during Stage 1 dispatch. They are not blockers for Stage 0.

1. **Telegram bot credentials.** Defer to Stage 2, or set up now via @BotFather so the agents can actually ping during Stage 1?
2. **Cursor version pinning.** Should `launch.ts` pin to a specific Cursor build (read from your current `/Applications/Cursor.app` and lock it), or read from `CURSOR_VERSION` env?
3. **VM mode.** Tart gets the executable scripts. Want UTM scripts too, or is the documented README path enough?
4. **Ollama model.** Llama-3.1-8B baseline (~5 GB) — also include Phi-3.5-mini fallback (~2 GB)?
5. **Sample VoC posts.** Cowork generates 30 hand-crafted realistic posts in Stage 3. Want any specific themes seeded (e.g., MCP frustration, autocomplete latency complaints, billing confusion)?

## 10. Adaptation note — workspace shell unavailable

Cowork's sandboxed bash failed to boot this session (virtiofs mount error, persistent across retries). The original plan called for Cowork to run `git init` and `git worktree add` from inside the orchestration session. Adaptation: Cowork writes `bootstrap.sh` — a single idempotent shell script that does the git init, the empty initial commit, and creates both worktrees. Alex runs it once on his Mac before Stage 1 dispatch. The original architectural intent (worktrees, branches, file ownership) is preserved exactly; only the actor performing the git invocations has shifted.

This is documented as Risk R6 and is the only divergence from the master prompt.
