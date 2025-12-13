"""
summarization.py

Use AI to generate a summary of text content.

Primary:
- Instruction-tuned LLM (Mistral-7B-Instruct, strict JSON)

Fallback:
- Simple sentence-based extractive summary
"""

from typing import Optional, Dict, List, Any
import logging
import re

from ..types import AIResponse
from ..prompts.summarization_prompt import get_summarization_prompt
from ..runners.llm_json_runner import run_llm_json

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------
LLM_MODEL_KEY = "mistral-7b-instruct"
MAX_INPUT_TOKENS = 160  # Maximum new tokens the LLM can generate
MAX_INPUT_CHARS = 4000  # Hard cap for input length in characters

# ---------------------------------------------------------------------
# Utilities
# ---------------------------------------------------------------------
def _fallback_summary(text: str) -> str:
    """
    Extractive fallback summary.

    Uses the first 3 sentences as a cheap, deterministic approximation.
    """
    sentences = re.split(r"(?<=[.!?])\s+", text.strip())
    return " ".join(sentences[:3]).strip()

def _validate_llm_schema(obj: Dict[str, Any]) -> None:
    if not isinstance(obj, dict):
        raise ValueError("LLM output is not a JSON object")

    summary = obj.get("summary")
    if not isinstance(summary, str) or not summary.strip():
        raise ValueError("Invalid or empty summary field")

# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------
def summarize(content: Optional[str]) -> AIResponse:
    errors: List[str] = []
    meta: Dict[str, Any] = {}

    if not content or not content.strip():
        return AIResponse(
            status="error",
            data={"summary": ""},
            errors=["Empty input provided."],
            meta=None,
        )

    content = content.strip()

    # -------------------------------------------------
    # Normalize text (defensive)
    # -------------------------------------------------
    try:
        normalized = re.sub(r"[\x00-\x1F]+", " ", content)
        normalized = re.sub(r"\s+", " ", normalized).strip()

        if not normalized:
            return AIResponse(
                status="ok",
                data={"summary": _fallback_summary(content)},
                errors=None,
                meta={"reason": "empty_after_normalization"},
            )

    except Exception as e:
        logger.error(f"Normalization failed: {e}")
        return AIResponse(
            status="error",
            data={"summary": _fallback_summary(content)},
            errors=[f"Normalization failed: {e}"],
            meta=None,
        )

    # -------------------------------------------------
    # Input length guard (character-based)
    # -------------------------------------------------
    effective_text = normalized[:MAX_INPUT_CHARS]

    if len(normalized) > MAX_INPUT_CHARS:
        meta["truncated"] = True
        meta["original_length"] = len(normalized)

    # -------------------------------------------------
    # LLM summarization
    # -------------------------------------------------
    try:
        prompt = get_summarization_prompt(effective_text)

        llm_response = run_llm_json(
            prompt=prompt,
            model=LLM_MODEL_KEY,
            max_new_tokens=MAX_INPUT_TOKENS,
            temperature=0.2,
            do_sample=False,
            schema_validator=_validate_llm_schema,
            meta={
                "analysis_type": "summarization",
                "analysis_model": LLM_MODEL_KEY,
                **meta,
            },
        )

        summary = llm_response.data["summary"].strip()

        if not summary:
            raise ValueError("LLM returned empty summary")

        return AIResponse(
            status="ok",
            data={"summary": summary},
            errors=None,
            meta=llm_response.meta,
        )

    except Exception as e:
        logger.warning(f"LLM summarization failed: {e}")
        errors.append(f"LLM failed: {e}")

    # -------------------------------------------------
    # Fallback to extractive summary
    # -------------------------------------------------
    return AIResponse(
        status="partial",
        data={"summary": _fallback_summary(content)},
        errors=errors,
        meta={"reason": "fallback_extractive", **meta},
    )
