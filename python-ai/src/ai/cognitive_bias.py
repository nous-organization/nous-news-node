from typing import List
from .types import AIResponse
from .models import get_pipeline
import logging
import json
import re

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

MAX_TOKENS = 512
MAX_GPT2_PROMPT_TOKENS = 256
MAX_NEW_TOKENS = 180

# Lazy-load tokenizers
_SENTIMENT_TOKENIZER = None
_GPT_TOKENIZER = None

def get_sentiment_tokenizer():
    global _SENTIMENT_TOKENIZER
    if _SENTIMENT_TOKENIZER is None:
        from transformers import AutoTokenizer
        _SENTIMENT_TOKENIZER = AutoTokenizer.from_pretrained(
            "distilbert-base-uncased-finetuned-sst-2-english"
        )
        logger.info("Sentiment tokenizer loaded")
    return _SENTIMENT_TOKENIZER

def get_gpt_tokenizer():
    global _GPT_TOKENIZER
    if _GPT_TOKENIZER is None:
        from transformers import AutoTokenizer
        _GPT_TOKENIZER = AutoTokenizer.from_pretrained("gpt2")
        logger.info("GPT tokenizer loaded")
    return _GPT_TOKENIZER


def get_cognitive_bias_prompt(text: str) -> str:
    return (
        "Identify cognitive biases in the following text and return ONLY a JSON array.\n"
        "Each item should be: {\"bias\": str, \"explanation\": str}.\n\n"
        f"Text:\n{text}\n\nJSON:"
    )


def detect_cognitive_bias(content: str, use_text_gen: bool = True) -> AIResponse:
    errors: List[str] = []
    meta = {}
    results: List[dict] = []

    if not content or not content.strip():
        return AIResponse(
            status="error",
            data=[],
            errors=["Empty input"],
            meta=meta
        )

    # ---------------------------------------------------
    # STAGE 1: sentiment-based bias likelihood
    # ---------------------------------------------------
    try:
        tokenizer = get_sentiment_tokenizer()
        tokens = tokenizer.encode(content, truncation=True, max_length=MAX_TOKENS)
        truncated_text = tokenizer.decode(tokens, skip_special_tokens=True)
        meta["input_tokens"] = len(tokens)

        classifier = get_pipeline("text-classification", "distilbert-sst2")
        classification = classifier(truncated_text)
        label = classification[0]["label"].upper()

        is_biased = label == "POSITIVE"
        meta["is_biased_stage1"] = is_biased

        if not is_biased and not use_text_gen:
            return AIResponse(status="ok", data=results, errors=None, meta=meta)

    except Exception as e:
        errors.append(f"Stage 1 classification failed: {str(e)}")
        if not use_text_gen:
            return AIResponse(status="error", data=results, errors=errors, meta=meta)

    # ---------------------------------------------------
    # STAGE 2: GPT-2 cognitive bias extraction
    # ---------------------------------------------------
    if use_text_gen:
        try:
            gpt_tokenizer = get_gpt_tokenizer()
            gpt_tokens = gpt_tokenizer.encode(
                content, truncation=True, max_length=MAX_GPT2_PROMPT_TOKENS
            )
            prompt_text = gpt_tokenizer.decode(gpt_tokens, skip_special_tokens=True)
            prompt = get_cognitive_bias_prompt(prompt_text)

            generator = get_pipeline("text-generation", "gpt2")
            output = generator(prompt, max_new_tokens=MAX_NEW_TOKENS, do_sample=False)
            generated_text = output[0].get("generated_text", "")

            if not generated_text:
                errors.append("GPT-2 returned empty output.")
            else:
                # Extract first JSON array in output
                match = re.search(r"\[[\s\S]*?\]", generated_text)
                if match:
                    try:
                        results = json.loads(match.group(0))
                    except json.JSONDecodeError as e:
                        errors.append(f"JSON parse failed: {str(e)}")
                else:
                    errors.append("No JSON array found in GPT-2 output.")

        except Exception as e:
            errors.append(f"Stage 2 GPT-2 generation failed: {str(e)}")

    status = "ok" if not errors else ("partial" if results else "error")

    return AIResponse(
        status=status,
        data=results,
        errors=errors if errors else None,
        meta=meta,
    )
