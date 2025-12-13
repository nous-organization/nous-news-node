"""
extract_tags.py

Extract relevant tags or keywords from text using a lightweight
NER (Named Entity Recognition) model.

This service is intentionally non-LLM:
- deterministic
- fast
- cheap
- stable for tagging
"""

from typing import List
import re
import logging

from ..types import AIResponse
from ..models import get_pipeline
from ..utils.tokenizer import get_tokenizer

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------
MODEL_KEY = "bert-ner"
TOKENIZER_KEY = "bert-ner"
MAX_INPUT_TOKENS = 512

# ---------------------------------------------------------------------
# Cached pipeline accessor
# ---------------------------------------------------------------------
def get_ner_pipeline():
    """
    Load and cache the NER pipeline using the shared model loader.
    Device placement is handled inside models.py.
    """
    return get_pipeline("token-classification", MODEL_KEY)

# ---------------------------------------------------------------------
# Main extraction function
# ---------------------------------------------------------------------
def extract_tags(content: str) -> AIResponse:
    """
    Extract relevant tags or keywords from the text using NER.

    Returns
    -------
    AIResponse
        status: "ok" | "partial" | "error"
        data: List[str] (lowercase, deduplicated)
        meta: token counts and truncation info
    """
    errors: List[str] = []
    meta: dict = {}
    tags: List[str] = []

    if not content or not content.strip():
        return AIResponse(status="ok", data=[], errors=None, meta=meta)

    try:
        # -------------------------------------------------
        # Normalize text
        # -------------------------------------------------
        normalized = re.sub(r"[\x00-\x1F\x7F]", " ", content)
        normalized = re.sub(r"\s+", " ", normalized).strip()

        if not normalized:
            return AIResponse(status="ok", data=[], errors=None, meta=meta)

        # -------------------------------------------------
        # Tokenization + truncation
        # -------------------------------------------------
        tokenizer = get_tokenizer(TOKENIZER_KEY)

        token_ids = tokenizer.encode(
            normalized,
            truncation=True,
            max_length=MAX_INPUT_TOKENS,
        )

        meta["input_tokens"] = len(token_ids)

        if not token_ids:
            errors.append("Tokenizer produced zero tokens.")
            return AIResponse(status="ok", data=[], errors=errors, meta=meta)

        truncated_text = tokenizer.decode(
            token_ids,
            skip_special_tokens=True,
        )

        # -------------------------------------------------
        # Run NER
        # -------------------------------------------------
        tagger = get_ner_pipeline()
        entities = tagger(truncated_text)

        if entities and isinstance(entities, list):
            tags = sorted({
                e["word"].lower()
                for e in entities
                if "entity_group" in e and e["entity_group"]
            })

        status = "ok" if not errors else ("partial" if tags else "error")

        return AIResponse(
            status=status,
            data=tags,
            errors=errors or None,
            meta=meta,
        )

    except Exception as e:
        msg = str(e) or "Unknown tag extraction error"
        logger.warning(f"Tag extraction failed: {msg}")
        return AIResponse(
            status="error",
            data=[],
            errors=[msg],
            meta=meta,
        )
