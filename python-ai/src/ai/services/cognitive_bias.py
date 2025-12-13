"""
cognitive_bias.py

Detect cognitive biases in text using:
1) Lightweight sentiment-based likelihood gating
2) Instruction-tuned LLM (Mistral-7B-Instruct) for structured extraction
"""

from typing import List, Dict, Any
import logging

from ..types import AIResponse
from ..models import get_pipeline
from ..runners.llm_json_runner import run_llm_json
from ..utils.tokenizer import get_tokenizer
from ..prompts.cognitive_bias_prompt import get_cognitive_bias_prompt

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------
SENTIMENT_MODEL_KEY = "distilbert-sst2"
LLM_MODEL_KEY = "mistral-7b-instruct"

MAX_INPUT_TOKENS = 512
MAX_PROMPT_TOKENS = 384
MAX_NEW_TOKENS = 256

# ---------------------------------------------------------------------
# Optional schema validation
# ---------------------------------------------------------------------
def _validate_bias_schema(data: Any) -> None:
    if not isinstance(data, list):
        raise ValueError("Cognitive bias output must be a JSON array")

    for item in data:
        if not isinstance(item, dict):
            raise ValueError("Each bias entry must be an object")
        if "bias" not in item:
            raise ValueError("Bias entry missing 'bias' field")

# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------
def detect_cognitive_bias(content: str, use_text_gen: bool = True) -> AIResponse:
    """
    Detect cognitive biases in a text sample.

    Pipeline:
    - Stage 1: Sentiment-based likelihood gating
    - Stage 2: LLM-based structured bias extraction (Mistral)

    Returns
    -------
    AIResponse
        status: "ok" | "partial" | "error"
        data: list of detected biases
        meta: token counts and gating info
    """
    errors: List[str] = []
    results: List[Dict[str, Any]] = []
    meta: Dict[str, Any] = {}

    if not content or not content.strip():
        return AIResponse(
            status="error",
            data=[],
            errors=["Empty input"],
            meta=meta,
        )

    # ---------------------------------------------------
    # STAGE 1: Sentiment-based likelihood gating
    # ---------------------------------------------------
    try:
        tokenizer = get_tokenizer(SENTIMENT_MODEL_KEY)

        encoded = tokenizer(
            content,
            truncation=True,
            max_length=MAX_INPUT_TOKENS,
            return_tensors=None,
        )

        input_ids = encoded["input_ids"]
        meta["input_tokens"] = len(input_ids)

        truncated_text = tokenizer.decode(
            input_ids,
            skip_special_tokens=True,
        )

        classifier = get_pipeline("text-classification", SENTIMENT_MODEL_KEY)
        classification = classifier(truncated_text)
        label = classification[0]["label"].upper()

        # Heuristic:
        # Emotionally charged content is more likely to contain bias
        is_biased = label == "POSITIVE"
        meta["stage1_sentiment"] = label
        meta["is_biased_stage1"] = is_biased

        if not is_biased and not use_text_gen:
            return AIResponse(
                status="ok",
                data=[],
                errors=None,
                meta=meta,
            )

    except Exception as e:
        errors.append(f"Stage 1 sentiment gating failed: {e}")
        if not use_text_gen:
            return AIResponse(
                status="error",
                data=[],
                errors=errors,
                meta=meta,
            )

    # ---------------------------------------------------
    # STAGE 2: LLM-based cognitive bias extraction (Mistral)
    # ---------------------------------------------------
    if use_text_gen:
        try:
            llm_tokenizer = get_tokenizer(LLM_MODEL_KEY)

            llm_encoded = llm_tokenizer(
                content,
                truncation=True,
                max_length=MAX_PROMPT_TOKENS,
                return_tensors=None,
            )

            prompt_text = llm_tokenizer.decode(
                llm_encoded["input_ids"],
                skip_special_tokens=True,
            )

            prompt = get_cognitive_bias_prompt(prompt_text)

            results = run_llm_json(
                model_key=LLM_MODEL_KEY,
                prompt=prompt,
                max_new_tokens=MAX_NEW_TOKENS,
                temperature=0.3,
                do_sample=False,
                schema_validator=_validate_bias_schema,
            )

            meta["analysis_model"] = LLM_MODEL_KEY

        except Exception as e:
            logger.exception("Cognitive bias LLM stage failed")
            errors.append(f"Stage 2 LLM extraction failed: {e}")

    # ---------------------------------------------------
    # Final response
    # ---------------------------------------------------
    if errors and results:
        status = "partial"
    elif errors:
        status = "error"
    else:
        status = "ok"

    return AIResponse(
        status=status,
        data=results,
        errors=errors or None,
        meta=meta or None,
    )
