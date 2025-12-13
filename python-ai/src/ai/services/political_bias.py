"""
political_bias.py

Detect the political bias of an article.

Primary:
- Instruction-tuned LLM (Mistral-7B-Instruct, JSON-strict)

Secondary:
- DeBERTa classifier

Uses:
- Ensemble voting
- Uncertainty detection
"""

from typing import Optional, Dict, List, Any
import logging

from ..types import AIResponse
from ..models import get_pipeline
from ..prompts.political_bias_prompt import get_political_bias_prompt
from ..runners.llm_json_runner import run_llm_json
from ..utils.tokenizer import get_tokenizer 

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------
MAX_INPUT_TOKENS = 512
CONFIDENCE_THRESHOLD = 0.65

LLM_MODEL_KEY = "mistral-7b-instruct"
CLASSIFIER_MODEL_KEY = "political-leaning"
CLASSIFIER_TASK = "text-classification"

ALLOWED_BIASES = {"left", "center", "right", "uncertain"}


# ---------------------------------------------------------------------
# Schema validation
# ---------------------------------------------------------------------
def _validate_llm_schema(obj: Dict[str, Any]) -> None:
    if not isinstance(obj, dict):
        raise ValueError("LLM output is not a JSON object")

    bias = obj.get("bias")
    if bias not in {"left", "center", "right"}:
        raise ValueError(f"Invalid bias value: {bias}")


# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------
def detect_political_bias(content: Optional[str]) -> AIResponse:
    errors: List[str] = []
    meta: Dict[str, Any] = {}

    if not content or not content.strip():
        return AIResponse(
            status="error",
            data={"political_bias": ""},
            errors=["Empty input provided"],
            meta=None,
        )

    content = content.strip()

    llm_bias: Optional[str] = None
    clf_bias: Optional[str] = None
    clf_conf: float = 0.0

    # -------------------------------------------------
    # 1. LLM vote (strict JSON)
    # -------------------------------------------------
    try:
        prompt = get_political_bias_prompt(content)

        llm_response = run_llm_json(
            prompt=prompt,
            model=LLM_MODEL_KEY,
            max_input_tokens=MAX_INPUT_TOKENS,
            max_prompt_tokens=384,
            max_new_tokens=128,
            temperature=0.2,
            do_sample=False,
            schema_validator=_validate_llm_schema,
            meta={"analysis_type": "political_bias"},
        )

        llm_bias = llm_response.data.get("bias")
        meta["llm_bias"] = llm_bias

    except Exception as e:
        logger.warning(f"LLM bias detection failed: {e}")
        errors.append(f"LLM failed: {e}")

    # -------------------------------------------------
    # 2. Classifier vote
    # -------------------------------------------------
    try:
        classifier = get_pipeline(CLASSIFIER_TASK, CLASSIFIER_MODEL_KEY)
        tokenizer = get_tokenizer(CLASSIFIER_MODEL_KEY)  # now using utils.tokenizer

        tokens = tokenizer.encode(
            content,
            truncation=True,
            max_length=MAX_INPUT_TOKENS,
        )
        safe_text = tokenizer.decode(tokens, skip_special_tokens=True)

        result = classifier(safe_text)[0]
        clf_bias = result["label"].lower()
        clf_conf = float(result.get("score", 0.0))

        meta["classifier_bias"] = clf_bias
        meta["classifier_confidence"] = clf_conf

    except Exception as e:
        logger.error(f"Classifier failed: {e}")
        errors.append(f"Classifier failed: {e}")

    # -------------------------------------------------
    # 3. Ensemble resolution
    # -------------------------------------------------
    final_bias = "uncertain"

    if clf_conf < CONFIDENCE_THRESHOLD:
        final_bias = "uncertain"
        meta["reason"] = "low_confidence"

    elif llm_bias and clf_bias:
        if llm_bias == clf_bias:
            final_bias = llm_bias
            meta["reason"] = "ensemble_agreement"
        else:
            final_bias = "uncertain"
            meta["reason"] = "ensemble_disagreement"

    elif clf_bias:
        final_bias = clf_bias
        meta["reason"] = "classifier_only"

    elif llm_bias:
        final_bias = llm_bias
        meta["reason"] = "llm_only"

    status = "ok" if final_bias in ALLOWED_BIASES else "error"

    return AIResponse(
        status=status,
        data={"political_bias": final_bias},
        errors=errors if errors else None,
        meta=meta,
    )
