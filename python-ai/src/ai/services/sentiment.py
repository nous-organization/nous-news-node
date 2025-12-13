"""
sentiment.py

Sentiment analysis with ensemble fallback.

Primary:
- Instruction-tuned LLM (Mistral-7B-Instruct, strict JSON)

Secondary:
- DistilBERT SST-2 classifier

Uses:
- Weighted voting
- Uncertainty detection
"""

from typing import Optional, Dict, List, Any
import logging

from ..types import AIResponse
from ..models import get_pipeline
from ..utils.tokenizer import get_tokenizer
from ..prompts.sentiment_prompt import get_sentiment_prompt
from ..runners.llm_json_runner import run_llm_json

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------
MAX_INPUT_TOKENS = 256
MAX_NEW_TOKENS = 128

LLM_MODEL_KEY = "mistral-7b-instruct"
CLASSIFIER_MODEL_KEY = "distilbert-sst2"
CLASSIFIER_TASK = "text-classification"

LLM_WEIGHT = 0.6
CLASSIFIER_WEIGHT = 0.4

CONFIDENCE_THRESHOLD = 0.55
NEUTRAL_MARGIN = 0.15

SENTIMENT_MAP = {
    "negative": -1.0,
    "neutral": 0.0,
    "positive": 1.0,
}

# ---------------------------------------------------------------------
# Schema validation
# ---------------------------------------------------------------------
def _validate_llm_schema(obj: Dict[str, Any]) -> None:
    if not isinstance(obj, dict):
        raise ValueError("LLM output is not a JSON object")

    sentiment = obj.get("sentiment")
    conf = obj.get("confidence")

    if sentiment not in SENTIMENT_MAP:
        raise ValueError(f"Invalid sentiment: {sentiment}")

    if not isinstance(conf, (int, float)) or not (0.0 <= conf <= 1.0):
        raise ValueError("Invalid confidence value")

# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------
def analyze_sentiment(content: Optional[str]) -> AIResponse:
    errors: List[str] = []
    meta: Dict[str, Any] = {}

    if not content or not content.strip():
        return AIResponse(
            status="error",
            data={"sentiment": ""},
            errors=["Empty input provided"],
            meta=None,
        )

    content = content.strip()

    llm_value: Optional[float] = None
    llm_conf: float = 0.0

    clf_value: Optional[float] = None
    clf_conf: float = 0.0

    # -------------------------------------------------
    # 1. LLM vote (primary)
    # -------------------------------------------------
    try:
        prompt = get_sentiment_prompt(content)

        llm_response = run_llm_json(
            prompt=prompt,
            model=LLM_MODEL_KEY,
            max_new_tokens=MAX_NEW_TOKENS,
            temperature=0.0,
            do_sample=False,
            schema_validator=_validate_llm_schema,
            meta={"analysis_type": "sentiment"},
        )

        sentiment = llm_response.data["sentiment"]
        llm_conf = float(llm_response.data["confidence"])
        llm_value = SENTIMENT_MAP[sentiment]

        meta["llm_sentiment"] = sentiment
        meta["llm_confidence"] = llm_conf

    except Exception as e:
        logger.warning(f"LLM sentiment failed: {e}")
        errors.append(f"LLM failed: {e}")

    # -------------------------------------------------
    # 2. Classifier vote (fallback)
    # -------------------------------------------------
    try:
        classifier = get_pipeline(CLASSIFIER_TASK, CLASSIFIER_MODEL_KEY)
        tokenizer = get_tokenizer(CLASSIFIER_MODEL_KEY)

        tokens = tokenizer.encode(
            content,
            truncation=True,
            max_length=MAX_INPUT_TOKENS,
        )
        safe_text = tokenizer.decode(tokens, skip_special_tokens=True)

        result = classifier(safe_text)[0]
        label = result["label"].lower()
        clf_conf = float(result.get("score", 0.0))

        clf_value = SENTIMENT_MAP.get(label, 0.0)

        meta["classifier_sentiment"] = label
        meta["classifier_confidence"] = clf_conf

    except Exception as e:
        logger.error(f"Classifier failed: {e}")
        errors.append(f"Classifier failed: {e}")

    # -------------------------------------------------
    # 3. Weighted ensemble resolution
    # -------------------------------------------------
    final_sentiment = "unknown"
    weighted_score = 0.0
    total_weight = 0.0

    if llm_value is not None:
        weighted_score += llm_value * llm_conf * LLM_WEIGHT
        total_weight += llm_conf * LLM_WEIGHT

    if clf_value is not None:
        weighted_score += clf_value * clf_conf * CLASSIFIER_WEIGHT
        total_weight += clf_conf * CLASSIFIER_WEIGHT

    if total_weight < CONFIDENCE_THRESHOLD:
        meta["reason"] = "low_total_confidence"

    else:
        normalized = weighted_score / total_weight
        meta["ensemble_score"] = normalized

        if abs(normalized) < NEUTRAL_MARGIN:
            final_sentiment = "neutral"
            meta["reason"] = "near_zero_score"
        elif normalized > 0:
            final_sentiment = "positive"
            meta["reason"] = "positive_weighted"
        else:
            final_sentiment = "negative"
            meta["reason"] = "negative_weighted"

    status = "ok" if final_sentiment != "unknown" else "partial"

    return AIResponse(
        status=status,
        data={"sentiment": final_sentiment},
        errors=errors if errors else None,
        meta=meta,
    )
