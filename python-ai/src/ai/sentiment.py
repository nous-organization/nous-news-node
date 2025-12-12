"""
sentiment.py

Perform sentiment analysis on an article using a lightweight sentiment model.
"""

from typing import Optional, Dict, Any, List
import logging

from .models import get_pipeline        # NEW: shared pipeline loader
from .tokenizer import get_tokenizer    # NEW: shared tokenizer

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

MAX_INPUT_TOKENS = 128  # Only analyze first part of the article for speed


def analyze_sentiment(content: Optional[str]) -> Dict[str, Any]:
    """
    Analyze sentiment of the given article content.

    Returns:
        {
            "status": "ok" | "error",
            "data": { "sentiment": "positive" | "negative" | "neutral" | "" },
            "errors": [...],
            "meta": {...}
        }
    """
    errors: List[str] = []
    meta: Dict[str, Any] = {}
    sentiment: str = ""

    # Empty input guard
    if not content or not content.strip():
        return {
            "status": "error",
            "data": {"sentiment": ""},
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
            "data": {"sentiment": ""},
            "errors": [msg],
        }

    # Load sentiment classifier
    try:
        classifier = get_pipeline("sentiment")
        if classifier is None:
            raise RuntimeError("Sentiment pipeline returned None")
    except Exception as e:
        msg = f"Sentiment classifier load failed: {e}"
        logger.error(msg)
        return {
            "status": "error",
            "data": {"sentiment": ""},
            "errors": [msg],
        }

    # Tokenize + truncate
    try:
        tokens = tokenizer.encode(content)
        meta["original_token_count"] = len(tokens)

        truncated_tokens = tokens[:MAX_INPUT_TOKENS]
        meta["truncated_token_count"] = len(truncated_tokens)

        input_text = tokenizer.decode(truncated_tokens, skip_special_tokens=True)

        if not input_text.strip():
            raise RuntimeError("Tokenizer decode produced empty text")

    except Exception as e:
        msg = f"Tokenization failed: {e}"
        return {
            "status": "error",
            "data": {"sentiment": ""},
            "errors": [msg],
            "meta": meta,
        }

    # Run classifier
    try:
        result = classifier(input_text)
        sentiment = result[0].get("label", "").lower() or "neutral"
    except Exception as e:
        errors.append(f"Sentiment classification failed: {e}")

    status = "ok" if not errors else "error"

    return {
        "status": status,
        "data": {"sentiment": sentiment},
        "errors": errors if errors else None,
        "meta": meta if meta else None,
    }
