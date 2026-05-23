"""Parity test — both severity.ts and severity.py must agree on every fixture case.

This test is intentionally NOT skipped. It is CI-fast (~5 s total) and guards
against silent drift between the TypeScript and Python severity implementations,
which both read from severity_rubric.json as the canonical source of truth.

Framework:   pytest + subprocess (for the TS side via severity_cli.ts)
Target:      voc/classify/severity.py  AND  voc/classify/severity_cli.ts
Pass/fail:   PASS if py["severity"] == ts["severity"] AND py["sev_band"] == ts["sev_band"]
             for every case in fixtures/severity_cases.json.
Precondition: Node 22+ and tsx must be in PATH. Run `npm ci` in worktrees/redteam/ first.
"""
from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any, cast

import pytest

from voc.classify.severity import score as score_py

_FIXTURES_PATH = Path(__file__).parent / "fixtures" / "severity_cases.json"
_CASES: list[dict[str, Any]] = json.loads(_FIXTURES_PATH.read_text(encoding="utf-8"))
_REPO_ROOT = Path(__file__).parent.parent.parent  # worktrees/redteam/


def _run_ts_scorer(signal: dict[str, Any]) -> dict[str, str]:
    """Call severity_cli.ts via npx tsx, return its JSON result."""
    result = subprocess.run(
        ["npx", "tsx", "voc/classify/severity_cli.ts"],
        input=json.dumps(signal),
        capture_output=True,
        text=True,
        check=True,
        cwd=str(_REPO_ROOT),
    )
    return cast(dict[str, str], json.loads(result.stdout.strip()))


@pytest.mark.parametrize("case", _CASES, ids=[c["name"] for c in _CASES])
def test_severity_parity(case: dict[str, Any]) -> None:
    """Python and TypeScript severity scorers must agree on every fixture case."""
    signal: dict[str, Any] = case["signal"]
    expected: dict[str, str] = case["expected"]

    py_result = score_py(signal)
    ts_result = _run_ts_scorer(signal)

    assert py_result["severity"] == ts_result["severity"], (
        f"[{case['name']}] severity divergence: "
        f"py={py_result['severity']} ts={ts_result['severity']}"
    )
    assert py_result["sev_band"] == ts_result["sev_band"], (
        f"[{case['name']}] sev_band divergence: "
        f"py={py_result['sev_band']} ts={ts_result['sev_band']}"
    )

    # Also assert both match the fixture expected value.
    assert py_result["severity"] == expected["severity"], (
        f"[{case['name']}] Python severity wrong: "
        f"got={py_result['severity']} expected={expected['severity']}"
    )
    assert py_result["sev_band"] == expected["sev_band"], (
        f"[{case['name']}] Python sev_band wrong: "
        f"got={py_result['sev_band']} expected={expected['sev_band']}"
    )
