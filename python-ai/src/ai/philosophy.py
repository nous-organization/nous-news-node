"""
philosophy.py

Generate a short philosophical or thematic interpretation of an article.

Uses the shared get_pipeline() helper for summarization.
"""

from typing import Optional, Dict, Any, List
from .models import get_pipeline
from .tokenizer import get_tokenizer
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

MAX_INPUT_TOKENS = 512
MAX_SUMMARY_TOKENS = 80


def generate_philosophical_insight(content: Optional[str]) -> Dict[str, Any]:
    """
    Generate a short philosophical or thematic interpretation of the article content.

    Returns:
        {
            "status": "ok" | "error",
            "data": { "insight": str },
            "errors": [...],
            "meta": {...}
        }
    """
    errors: List[str] = []
    meta: Dict[str, Any] = {}
    insight: str = ""

    if not content or not content.strip():
        return {
            "status": "error",
            "data": {"insight": ""},
            "errors": ["Empty input provided."],
        }

    # Load tokenizer
    try:
        tokenizer = get_tokenizer()
    except Exception as e:
        msg = f"Tokenizer load failed: {e}"
        logger.error(msg)
        return {
            "status": "error",
            "data": {"insight": ""},
            "errors": [msg],
        }

    # Load summarization pipeline
    try:
        summarizer = get_pipeline("summarization")
        if summarizer is None:
            raise RuntimeError("Summarization pipeline returned None")
    except Exception as e:
        msg = f"Summarization pipeline load failed: {e}"
        logger.error(msg)
        return {
            "status": "error",
            "data": {"insight": ""},
            "errors": [msg],
        }

    # Tokenize + truncate
    try:
        tokens = tokenizer.encode(content)
        meta["original_token_count"] = len(tokens)

        truncated_tokens = tokens[:MAX_INPUT_TOKENS]
        meta["truncated_token_count"] = len(truncated_tokens)

        input_text = tokenizer.decode(truncated_tokens, skip_special_tokens=True)

        if not input_text:
            raise RuntimeError("Tokenizer decode produced empty text")

    except Exception as e:
        msg = f"Tokenization failed: {e}"
        return {
            "status": "error",
            "data": {"insight": ""},
            "errors": [msg],
            "meta": meta,
        }

    # Generate "philosophical insight" summary
    try:
        result = summarizer(
            input_text,
            max_length=MAX_SUMMARY_TOKENS,
            min_length=20,
            do_sample=False
        )
        summary_text = result[0]["summary_text"]
        insight = f"Philosophical framing: {summary_text}"

        meta["insight_length"] = len(insight)

    except Exception as e:
        msg = f"Summarization failed: {e}"
        errors.append(msg)

    status = "ok" if not errors else "error"

    return {
        "status": status,
        "data": {"insight": insight},
        "errors": errors if errors else None,
        "meta": meta if meta else None,
    }
