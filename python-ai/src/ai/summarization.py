"""
summarization.py

Use AI to generate a summary of text content.
"""

from typing import Optional, Dict, Any, List
import logging
import re

from .models import get_pipeline       # NEW unified pipeline loader
from .tokenizer import get_tokenizer   # NEW unified tokenizer

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

MAX_INPUT_TOKENS = 512
MAX_SUMMARY_TOKENS = 120


def summarize(content: Optional[str]) -> Dict[str, Any]:
    """
    Summarize the given article content.

    Returns:
        {
            "status": "ok" | "error",
            "data": { "summary": str },
            "errors": [...],
            "meta": {...}
        }
    """
    errors: List[str] = []
    meta: Dict[str, Any] = {}
    summary: str = ""

    if not content or not content.strip():
        return {
            "status": "error",
            "data": {"summary": ""},
            "errors": ["Empty input provided."]
        }

    # Fallback summary if model fails
    def fallback_summary(text: str) -> str:
        sentences = re.split(r"(?<=[.!?])\s+", text)
        return " ".join(sentences[:3]).strip()

    # Load tokenizer
    try:
        tokenizer = get_tokenizer()
    except Exception as e:
        msg = f"Tokenizer load failed: {e}"
        logger.error(msg)
        return {
            "status": "error",
            "data": {"summary": fallback_summary(content)},
            "errors": [msg],
        }

    # Load summarization pipeline
    try:
        summarizer = get_pipeline("summarization")
        if summarizer is None:
            raise RuntimeError("Summarization pipeline returned None")
    except Exception as e:
        msg = f"Summarization model load failed: {e}"
        logger.error(msg)
        return {
            "status": "error",
            "data": {"summary": fallback_summary(content)},
            "errors": [msg],
        }

    # Normalize raw text
    try:
        normalized = re.sub(r"[\x00-\x1F]+", " ", content)
        normalized = re.sub(r"\s+", " ", normalized).strip()
        if not normalized:
            return {
                "status": "ok",
                "data": {"summary": fallback_summary(content)}
            }
    except Exception as e:
        msg = f"Normalization failed: {e}"
        logger.error(msg)
        return {
            "status": "error",
            "data": {"summary": fallback_summary(content)},
            "errors": [msg],
        }

    # Tokenization + truncation
    try:
        tokens = tokenizer.encode(normalized)
        meta["original_token_count"] = len(tokens)

        truncated_tokens = tokens[:MAX_INPUT_TOKENS]
        meta["truncated_token_count"] = len(truncated_tokens)

        if not truncated_tokens:
            return {
                "status": "error",
                "data": {"summary": fallback_summary(content)},
                "errors": ["Tokenizer produced empty token array."],
                "meta": meta,
            }

        input_text = tokenizer.decode(truncated_tokens, skip_special_tokens=True)

    except Exception as e:
        msg = f"Tokenization failed: {e}"
        logger.error(msg)
        return {
            "status": "error",
            "data": {"summary": fallback_summary(content)},
            "errors": [msg],
            "meta": meta,
        }

    # Run summarizer
    try:
        result = summarizer(
            input_text,
            max_length=MAX_SUMMARY_TOKENS,
            min_length=30,
            do_sample=False,
        )
        summary = result[0].get("summary_text", "").strip()

        if not summary:
            summary = fallback_summary(content)

    except Exception as e:
        msg = f"Summarization failed: {e}"
        logger.error(msg)
        summary = fallback_summary(content)
        errors.append(msg)

    status = "ok" if not errors else "error"

    return {
        "status": status,
        "data": {"summary": summary},
        "errors": errors if errors else None,
        "meta": meta if meta else None,
    }
