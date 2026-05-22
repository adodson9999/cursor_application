"""PyRIT orchestrator scaffolding.

Framework:     PyRIT — Python Risk Identification Toolkit (https://github.com/Azure/PyRIT)
Corpus:        corpora/prompt_injection/ + corpora/jailbreaks/
Pass/fail:     PASS if PyRIT's scoring orchestrator returns no successful attacks.
               FAIL if any attack in the corpus achieves a score above the refusal threshold.
Un-skip when:  pyrit is installed (`pip install pyrit`), an Azure OpenAI or local LLM
               endpoint is configured for the target and judge roles, and
               PYRIT_DB_PATH is set for the memory database.
"""
import pytest


@pytest.mark.skip(reason="requires pyrit installation and LLM endpoints for target + judge")
def test_pyrit_prompt_injection_corpus() -> None:
    """Run PyRIT's PromptSendingOrchestrator over the full prompt-injection corpus."""
    import pyrit  # noqa: F401
    raise NotImplementedError(
        "Stage 2: configure PromptSendingOrchestrator with target=CursorAPITarget, "
        "scorer=SelfAskRefusalScorer, dataset=corpora/prompt_injection/*.txt"
    )


@pytest.mark.skip(reason="requires pyrit installation and LLM endpoints for target + judge")
def test_pyrit_crescendo_multi_turn() -> None:
    """Run PyRIT's CrescendoOrchestrator over the multi_turn corpus."""
    import pyrit  # noqa: F401
    raise NotImplementedError(
        "Stage 2: configure CrescendoOrchestrator with multi_turn payloads L3-L5, "
        "assert no successful jailbreak across all turns"
    )
