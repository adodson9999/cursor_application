#!/usr/bin/env bash
# ============================================================================
# bootstrap.sh — one-shot repo + worktree initialization
#
# Cowork's sandboxed shell was unavailable during Stage 0, so this script
# does the git init and worktree creation that Cowork would otherwise have
# run from inside its session. Run once from the repo root before Stage 1
# dispatch:
#
#     bash bootstrap.sh
#
# Idempotent — safe to re-run; it will not clobber existing branches or
# worktrees and will exit early with a clear message if everything is
# already set up.
# ============================================================================

set -euo pipefail

repo_root="$(cd "$(dirname "$0")" && pwd)"
cd "$repo_root"

say() { printf '[bootstrap] %s\n' "$*"; }

# ---- 1. git repo --------------------------------------------------------------
if [ ! -d .git ]; then
  say "git init on main"
  git init --initial-branch=main >/dev/null
else
  say "git repo already initialized"
fi

# Identity — only set if absent so we never overwrite the user's globals.
if ! git config user.email >/dev/null 2>&1; then
  say "configuring local git identity (user did not have one set)"
  git config user.email "cowork@local"
  git config user.name "Cowork Orchestrator"
fi

# ---- 2. initial commit (empty) so worktrees have something to branch from ----
if ! git rev-parse --verify --quiet HEAD >/dev/null; then
  say "creating empty initial commit on main"
  git add -A
  if git diff --cached --quiet; then
    git commit --allow-empty -m "chore: initial commit (Stage 0 — Cowork)"
  else
    git commit -m "chore: initial commit (Stage 0 — Cowork)"
  fi
else
  say "main already has a commit — staging any new Stage 0 files"
  git add -A
  if ! git diff --cached --quiet; then
    git commit -m "chore(stage-0): cowork artefacts (plan, telegram lib, bootstrap)"
  else
    say "nothing new to commit"
  fi
fi

# ---- 3. worktrees -------------------------------------------------------------
mkdir -p worktrees

create_worktree () {
  local path="$1"
  local branch="$2"
  if git worktree list --porcelain | grep -q "^worktree $repo_root/$path$"; then
    say "worktree $path already exists — skipping"
    return
  fi
  if git show-ref --verify --quiet "refs/heads/$branch"; then
    say "branch $branch exists; attaching worktree at $path"
    git worktree add "$path" "$branch" >/dev/null
  else
    say "creating worktree $path on new branch $branch"
    git worktree add "$path" -b "$branch" >/dev/null
  fi
}

create_worktree "worktrees/harness" "agent/claude-code"
create_worktree "worktrees/redteam" "agent/antigravity"

# ---- 4. data dir for telegram audit log --------------------------------------
mkdir -p data
[ -f data/.gitkeep ] || touch data/.gitkeep

# ---- 5. final status ---------------------------------------------------------
say "done."
say "main branch:  $(git rev-parse --short HEAD) on $(git rev-parse --abbrev-ref HEAD)"
say "worktrees:"
git worktree list | sed 's/^/    /'
say ""
say "next: tell Cowork the bootstrap is green; Cowork will generate Stage 1 sub-prompts."
