# python-ai/src/ai/extract_tags_ai.py
from typing import List
from .types import AIResponse
import re
import logging

from .models import get_pipeline
from .utils.device import get_device

logger = logging.getLogger(__name__)


# -----------------------------------------------------
# Constants
# -----------------------------------------------------
MODEL_KEY = "bert-ner"
TRUNCATE_TOKENS = 512


# -----------------------------------------------------
# Cached pipeline accessor
# -----------------------------------------------------
def get_ner_pipeline():
    """
    Loads and caches the NER pipeline using our model loader system.
    The model loader automatically downloads + caches models in .models/
    and can run on GPU/MPS if available.
    """
    # tokenizer is automatically created by pipeline, cached via model loader
    # We explicitly pass device so GPU/MPS is used when available.
    return get_pipeline("token-classification", MODEL_KEY).to(get_device())


# -----------------------------------------------------
# Main extraction function
# -----------------------------------------------------
async def extract_tags_ai(content: str) -> AIResponse:
    """
    Extract relevant tags or keywords from the text using BERT NER.

    Returns an AIResponse with:
    - status: "ok" or "error"
    - data: list of extracted tags (lowercase, deduplicated)
    - errors: any warnings or errors encountered
    - meta: token counts, truncated lengths
    """
    errors: List[str] = []
    meta: dict = {}

    if not content:
        return {"status": "ok", "data": [], "errors": None, "meta": meta}

    try:
        # Normalize content: remove control chars, collapse whitespace
        normalized_content = re.sub(
            r"\s+",
            " ",
            re.sub(r"[\x00-\x1F\x7F]", " ", content)
        ).strip()

        if not normalized_content:
            return {"status": "ok", "data": [], "errors": None, "meta": meta}

        # Get tokenizer from pipeline
        tagger = get_ner_pipeline()
        tokenizer = tagger.tokenizer

        # Tokenize
        tokens = tokenizer.encode(normalized_content)
        valid_tokens = [t for t in tokens if isinstance(t, int)]

        meta["original_token_count"] = len(tokens)
        meta["valid_token_count"] = len(valid_tokens)

        if not valid_tokens:
            errors.append("Tokenizer produced no valid tokens.")
            return {"status": "ok", "data": [], "errors": errors, "meta": meta}

        # Truncate for safety
        truncated_tokens = valid_tokens[:TRUNCATE_TOKENS]
        meta["truncated_token_count"] = len(truncated_tokens)

        try:
            truncated_text = tokenizer.decode(truncated_tokens, skip_special_tokens=True)
        except Exception as e:
            errors.append(f"Tokenizer decode failed, using fallback: {str(e)}")
            truncated_text = normalized_content

        if not truncated_text:
            return {"status": "ok", "data": [], "errors": errors, "meta": meta}

        # Run NER
        entities = tagger(truncated_text)

        if not entities or not isinstance(entities, list):
            return {"status": "ok", "data": [], "errors": errors, "meta": meta}

        # Extract entity groups → lowercase, deduplicated
        tags = list({e["word"].lower() for e in entities if e.get("entity_group")})

        return {
            "status": "ok",
            "data": tags,
            "errors": errors if errors else None,
            "meta": meta,
        }

    except Exception as e:
        msg = str(e) or "Unknown tag extraction error"
        logger.warning(f"Tag extraction AI failed: {msg}")
        errors.append(msg)
        return {"status": "error", "data": [], "errors": errors, "meta": meta}
