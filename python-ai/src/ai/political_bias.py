"""
political_bias.py

Detect the political bias of an article using a lightweight sentiment-based proxy.
"""

from typing import Optional, Dict, Any, List
import logging

from .models import get_pipeline
from .tokenizer import get_tokenizer

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

MAX_INPUT_TOKENS = 128  # Only analyze first part of the article for speed


def detect_political_bias(content: Optional[str]) -> Dict[str, Any]:
    """
    Detect the political bias of the given article content.

    Returns:
        {
            "status": "ok" | "error",
            "data": { "political_bias": "left" | "center" | "right" | "" },
            "errors": [...],
            "meta": {...}
        }
    """
    errors: List[str] = []
    meta: Dict[str, Any] = {}
    political_bias: str = ""

    if not content or not content.strip():
        return {
            "status": "error",
            "data": {"political_bias": ""},
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
            "data": {"political_bias": ""},
            "errors": [msg],
        }

    # Load classifier (sentiment model)
    try:
        classifier = get_pipeline("sentiment")
        if classifier is None:
            raise RuntimeError("Sentiment pipeline returned None")
    except Exception as e:
        msg = f"Sentiment classifier load failed: {e}"
        logger.error(msg)
        return {
            "status": "error",
            "data": {"political_bias": ""},
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
            "data": {"political_bias": ""},
            "errors": [msg],
            "meta": meta,
        }

    # Classify sentiment → map to political bias
    try:
        result = classifier(input_text)
        label = result[0].get("label", "").lower()

        if "positive" in label:
            political_bias = "left"
        elif "negative" in label:
            political_bias = "right"
        else:
            political_bias = "center"

    except Exception as e:
        errors.append(f"Political bias classification failed: {e}")

    status = "ok" if not errors else "error"

    return {
        "status": status,
        "data": {"political_bias": political_bias},
        "errors": errors if errors else None,
        "meta": meta if meta else None,
    }
