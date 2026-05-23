"""severity.py — Python mirror of severity.ts.

Both files read severity_rubric.json as the single source of truth.
Do not hardcode thresholds or keyword lists here — read them from the JSON.
If you change the rubric, both implementations update automatically.

Called by:
  - tests/05_redteam_ai/test_severity_parity.py  (parity check against TS)
  - tests/05_redteam_ai/test_inspect_ai_security.py  (label failures by severity)
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any, TypedDict

_RUBRIC_PATH = Path(__file__).parent / "severity_rubric.json"
_RUBRIC: dict[str, Any] = json.loads(_RUBRIC_PATH.read_text(encoding="utf-8"))

Severity = str   # "P0" | "P1" | "P2" | "P3"
SevBand  = str   # "SEV0" | "SEV1" | "SEV2"


class SeveritySignal(TypedDict, total=False):
    source: str                      # "forum" | "reddit" | "hn" | "github" | "harness"
    themes: list[str]
    upvotes: int | None
    reply_count: int | None
    is_authenticated_bug: bool | None
    contains_data_loss_keyword: bool | None
    body_text: str | None


class SeverityResult(TypedDict):
    severity: str
    sev_band: str
    rationale: str


def band_for(severity: str) -> str:
    """Map a Severity level to its SEV band. Pure, reads from rubric."""
    return _RUBRIC["bands"].get(severity, "SEV2")


def score(signal: dict[str, Any]) -> SeverityResult:
    """Score a signal against the rubric. Early-exit if-chain, mirrors severity.ts exactly."""
    body_lower = (signal.get("body_text") or "").lower()
    themes_lower = [t.lower() for t in (signal.get("themes") or [])]
    source: str = signal.get("source", "forum")
    upvotes: int = signal.get("upvotes") or 0
    reply_count: int = signal.get("reply_count") or 0
    is_auth_bug: bool = bool(signal.get("is_authenticated_bug"))

    data_loss_kws: list[str] = _RUBRIC["data_loss_keywords"]
    security_kws: list[str] = _RUBRIC["security_keywords"]
    p0_themes: list[str] = _RUBRIC["p0_themes"]
    p1_themes: list[str] = _RUBRIC["p1_themes"]
    p2_themes: list[str] = _RUBRIC["p2_themes"]
    p3_themes: list[str] = _RUBRIC["p3_themes"]
    uv_thresh: int = _RUBRIC["high_volume_upvote_threshold"]
    rc_thresh: int = _RUBRIC["high_volume_reply_threshold"]
    source_weights: dict[str, float] = _RUBRIC["source_weights"]

    has_data_loss = (
        bool(signal.get("contains_data_loss_keyword"))
        or any(kw in body_lower for kw in data_loss_kws)
    )
    has_security = any(kw in body_lower for kw in security_kws) or any(
        t in p0_themes for t in themes_lower
    )

    # P0 / SEV0 — data loss, security exposure, or core feature regression. [rubric §P0]
    if has_data_loss:
        return {"severity": "P0", "sev_band": "SEV0", "rationale": "data-loss keyword detected in body"}
    if has_security:
        return {"severity": "P0", "sev_band": "SEV0", "rationale": "security keyword or P0 theme detected"}
    if is_auth_bug and source == "github" and any(t in p0_themes for t in themes_lower):
        return {"severity": "P0", "sev_band": "SEV0", "rationale": "authenticated GitHub bug with P0 theme"}

    # P1 / SEV1 — high-volume frustration or missing expected functionality. [rubric §P1]
    has_p1_theme = any(t in p1_themes for t in themes_lower)
    is_high_volume = upvotes >= uv_thresh or reply_count >= rc_thresh
    source_weight: float = source_weights.get(source, 1.0)

    if has_p1_theme and is_high_volume:
        return {"severity": "P1", "sev_band": "SEV1", "rationale": "P1 theme with high-volume engagement"}
    if has_p1_theme and source_weight >= 1.2:
        return {"severity": "P1", "sev_band": "SEV1", "rationale": f"P1 theme from high-weight source ({source})"}
    if is_auth_bug and has_p1_theme:
        return {"severity": "P1", "sev_band": "SEV1", "rationale": "authenticated GitHub bug with P1 theme"}

    # P2 / SEV1 — broadly noted annoyance or edge-case bugs. [rubric §P2]
    has_p2_theme = any(t in p2_themes for t in themes_lower)
    if has_p2_theme:
        return {"severity": "P2", "sev_band": "SEV1", "rationale": "P2 theme detected (annoyance / edge-case)"}
    if is_high_volume and not _all_p3(themes_lower, p3_themes):
        return {"severity": "P2", "sev_band": "SEV1", "rationale": "high-volume post without P1/P3-only theme"}

    # P3 / SEV2 — single-source nitpick, feature request, or comment. [rubric §P3]
    return {"severity": "P3", "sev_band": "SEV2", "rationale": "no high-priority signal detected"}


def _all_p3(themes_lower: list[str], p3_themes: list[str]) -> bool:
    """True when all themes are exclusively P3-level (or no themes)."""
    if not themes_lower:
        return True
    return all(t in p3_themes for t in themes_lower)
