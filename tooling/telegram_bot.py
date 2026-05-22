"""Telegram pinger for the Cursor PQE harness build sprint.

Owned by Cowork. Called by Claude Code and Antigravity from inside their
worktrees. Cowork itself sends zero messages — the library exists for the
two coding agents.

Each tone prepends a fixed opener so the four message types have visibly
different sentence rhythms even before the agent's message body:

    stage       "Status: "                              (one word, colon, clipped)
    demo_ready  "Demo path live. "                      (short declarative preamble)
    pdf_ready   "The artifact is on disk. "             (slight exhale)
    v1_tagged   "v1.0-hiring-manager. The build is done. "  (two-sentence closer)

Standard library + ``requests`` only. No telegram SDK, no daemon, no queue.
Reads ``TELEGRAM_BOT_TOKEN`` and ``TELEGRAM_CHAT_ID`` from environment (use a
``.env`` file at the repo root; agents source it before invoking Python).

Every send is appended to ``data/telegram.log`` for audit.
"""

from __future__ import annotations

import json
import logging
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Final, Literal

import requests

Tone = Literal["stage", "demo_ready", "pdf_ready", "v1_tagged"]

# The four tone openers. The differentia is deliberate — clipped, declarative,
# small exhale, two-sentence closer. Edit with care: the master prompt requires
# distinct sentence rhythms, not just distinct symbols.
_OPENERS: Final[dict[Tone, str]] = {
    "stage": "Status: ",
    "demo_ready": "Demo path live. ",
    "pdf_ready": "The artifact is on disk. ",
    "v1_tagged": "v1.0-hiring-manager. The build is done. ",
}

# Telegram caps a single sendMessage at 4096 chars. Leave headroom for openers.
_MAX_BODY: Final[int] = 3800

# Repo root resolves to the parent of tooling/. This file is committed at
# <repo>/tooling/telegram_bot.py, and the agents import it from their worktree
# checkouts which inherit the same relative layout.
_REPO_ROOT: Final[Path] = Path(__file__).resolve().parent.parent
_LOG_DIR: Final[Path] = _REPO_ROOT / "data"
_LOG_PATH: Final[Path] = _LOG_DIR / "telegram.log"


class TelegramConfigError(RuntimeError):
    """Raised when TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID is missing.

    Calling agents are expected to halt and surface the error to the user
    rather than continue silently. The preflight script exists to catch this
    at the start of a session before any real work is dispatched.
    """


class TelegramSendError(RuntimeError):
    """Raised when the Telegram HTTP call returns a non-2xx response.

    Includes the response status and body in the message so the calling
    agent can paste it directly into a halt-report to the user.
    """


def _load_dotenv_if_present() -> None:
    """Populate ``os.environ`` from a ``.env`` file at the repo root.

    Tiny hand-rolled parser; we do not pull ``python-dotenv`` as a dependency.
    Lines beginning with ``#`` are comments. Values may be quoted with single
    or double quotes; surrounding quotes are stripped. Existing environment
    values are not overwritten — explicit env beats .env, which matches the
    convention every other tool in this repo uses.
    """
    dotenv = _REPO_ROOT / ".env"
    if not dotenv.is_file():
        return
    for raw in dotenv.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


def _ensure_log_dir() -> None:
    _LOG_DIR.mkdir(parents=True, exist_ok=True)


def _audit(record: dict[str, object]) -> None:
    _ensure_log_dir()
    record["ts"] = datetime.now(timezone.utc).isoformat()
    with _LOG_PATH.open("a", encoding="utf-8") as fh:
        fh.write(json.dumps(record, ensure_ascii=False) + "\n")


def send(message: str, tone: Tone) -> None:
    """Send a single ping to Telegram.

    Args:
        message: The differentia — the agent-specific content that follows
            the tone's fixed opener. Should be one or two short sentences.
            Truncated at 3800 chars with an ellipsis to stay under Telegram's
            4096 cap once the opener is prepended.
        tone: One of ``stage`` / ``demo_ready`` / ``pdf_ready`` / ``v1_tagged``.
            Selects the opener and is recorded in the audit log.

    Raises:
        TelegramConfigError: if credentials are missing.
        TelegramSendError: if the Telegram API returns a non-2xx response.
    """
    if tone not in _OPENERS:
        raise ValueError(f"Unknown tone: {tone!r}. Valid: {sorted(_OPENERS)}")

    _load_dotenv_if_present()
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.environ.get("TELEGRAM_CHAT_ID", "").strip()
    if not token or not chat_id:
        _audit({"event": "send_skipped_missing_creds", "tone": tone})
        raise TelegramConfigError(
            "TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set. "
            "See .env.example for the BotFather setup steps."
        )

    body = message if len(message) <= _MAX_BODY else message[: _MAX_BODY - 1] + "…"
    payload = {
        "chat_id": chat_id,
        "text": _OPENERS[tone] + body,
        "disable_web_page_preview": True,
    }
    url = f"https://api.telegram.org/bot{token}/sendMessage"

    try:
        response = requests.post(url, data=payload, timeout=10)
    except requests.RequestException as exc:
        _audit({"event": "send_network_error", "tone": tone, "error": str(exc)})
        raise TelegramSendError(f"Telegram network error: {exc}") from exc

    if not response.ok:
        _audit(
            {
                "event": "send_http_error",
                "tone": tone,
                "status": response.status_code,
                "body": response.text[:500],
            }
        )
        raise TelegramSendError(
            f"Telegram returned {response.status_code}: {response.text[:500]}"
        )

    _audit({"event": "send_ok", "tone": tone, "chars": len(payload["text"])})


def _self_test() -> int:
    """Allow ``python tooling/telegram_bot.py "<message>" <tone>`` for ad-hoc use.

    Not the preflight — see ``telegram_preflight.py`` for that. This entrypoint
    exists so a curious user can verify the library from the command line
    without writing a wrapper script.
    """
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    if len(sys.argv) != 3:
        print(
            "usage: python tooling/telegram_bot.py <message> "
            "<stage|demo_ready|pdf_ready|v1_tagged>",
            file=sys.stderr,
        )
        return 2
    try:
        send(sys.argv[1], sys.argv[2])  # type: ignore[arg-type]
    except (TelegramConfigError, TelegramSendError) as exc:
        print(f"telegram: {exc}", file=sys.stderr)
        return 1
    print("telegram: sent")
    return 0


if __name__ == "__main__":
    sys.exit(_self_test())
