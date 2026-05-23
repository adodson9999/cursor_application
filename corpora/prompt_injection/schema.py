from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, HttpUrl


class PayloadMeta(BaseModel):
    id: str
    category: Literal[
        "direct_override",
        "role_play",
        "encoding",
        "multi_turn",
        "tool_call_manipulation",
        "system_prompt_extraction",
        "indirect_injection",
        "translation_language_switch",
        "output_format_hijack",
    ]
    level: int
    level_name: Literal["Naive", "Basic", "Polished", "Adversarial", "Production-grade"]
    intent: str
    expected_safe_behaviour: str
    source: str
    source_url: Optional[HttpUrl] = None
    attribution: Optional[str] = None
    notes: Optional[str] = None
