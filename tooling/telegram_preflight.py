"""Telegram preflight — the first action an agent runs in its worktree.

If this script exits non-zero, the agent halts and surfaces the failure to
Alex on the terminal. Cowork does not see Telegram failures itself; the agent
is responsible for its own halt-and-report.

Usage from inside a worktree:

    cd worktrees/harness        # or worktrees/redteam
    python ../../tooling/telegram_preflight.py
"""

from __future__ import annotations

import sys

from telegram_bot import TelegramConfigError, TelegramSendError, send


def main() -> int:
    try:
        send("preflight check — pinging from a fresh worktree.", tone="stage")
    except (TelegramConfigError, TelegramSendError) as exc:
        print(f"preflight FAILED: {exc}", file=sys.stderr)
        print(
            "Halt the current task and tell Alex what's broken. "
            "Do not proceed with stage work until the preflight passes.",
            file=sys.stderr,
        )
        return 1
    print("preflight OK")
    return 0


if __name__ == "__main__":
    sys.exit(main())
