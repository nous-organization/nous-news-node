"""
translate.py

Language detection and translation optimized for news articles.

Primary:
- Specialized MT models (mBART)

Fallback:
- Instruction-tuned LLM (Mistral-7B-Instruct, strict JSON)
"""

import re
import logging
from typing import List, Optional, Dict, Any

from ..models import get_pipeline
from ..utils.tokenizer import get_tokenizer
from ..utils.translation import get_mbart_lang
from ..types import AIResponse
from ..prompts.translation_prompt import get_translation_prompt
from ..runners.llm_json_runner import run_llm_json
from ..constants.languages import DEFAULT_LANG, DETECTOR_NAME_TO_ISO

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ------------------------------
# Model configuration constants
# ------------------------------
LANG_DETECT_MODEL_KEY = "bert-ner"
LANG_DETECT_TASK = "text-classification"

TRANSLATION_MODEL_KEY = "mbart-translate"
TRANSLATION_TASK = "translation"

LLM_MODEL_KEY = "mistral-7b-instruct"

TRANSLATION_TOKEN_LIMIT = 128
LANG_DETECTOR_BOUNDS = 128  # Limit for language detection input

# ------------------------------
# Helper functions
# ------------------------------
def get_detector():
    """Retrieve the language detection model pipeline."""
    return get_pipeline(LANG_DETECT_TASK, LANG_DETECT_MODEL_KEY)

def get_translator():
    """Retrieve the translation model pipeline."""
    return get_pipeline(TRANSLATION_TASK, TRANSLATION_MODEL_KEY)

def _split_sentences(text: str) -> List[str]:
    """Split the text into sentences for translation."""
    return re.findall(r"[^.!?]+[.!?]*", text) or [text]

# ------------------------------
# Language Detection
# ------------------------------
def detect_language(content: str) -> AIResponse:
    """
    Detect the language of the given content.

    Args:
    - content (str): The text content whose language is to be detected.

    Returns:
    - AIResponse: Language detection result.
    """
    meta: Dict[str, Any] = {}

    if not content.strip():
        return AIResponse(
            status="ok",
            data={"language": DEFAULT_LANG},
            errors=None,
            meta=meta,
        )

    try:
        detector = get_detector()
        clean = re.sub(r"[^\w\s]+", " ", content)[:LANG_DETECTOR_BOUNDS]
        result = detector(clean)

        raw = result[0]["label"].lower().strip()
        iso = DETECTOR_NAME_TO_ISO.get(raw, DEFAULT_LANG)

        meta["detected_raw"] = raw

        return AIResponse(
            status="ok",
            data={"language": iso},
            errors=None,
            meta=meta,
        )

    except Exception as e:
        logger.warning(f"Language detection failed: {e}")
        return AIResponse(
            status="error",
            data={"language": DEFAULT_LANG},
            errors=[str(e)],
            meta=meta,
        )

# ------------------------------
# Translation
# ------------------------------
def translate(content: str, target_language: Optional[str] = None) -> AIResponse:
    """
    Translate content to the target language.

    Args:
    - content (str): The text content to be translated.
    - target_language (str, optional): The target language for translation. Defaults to None.

    Returns:
    - AIResponse: Translation result or fallback.
    """
    meta: Dict[str, Any] = {}
    errors: List[str] = []

    if not content.strip():
        return AIResponse(
            status="fallback",
            data={"translation": content, "language": target_language or DEFAULT_LANG},
            errors=None,
            meta=meta,
        )

    target_iso = (target_language or DEFAULT_LANG).lower().strip()
    target_mbart = get_mbart_lang(target_iso)

    meta["target_language"] = target_iso
    meta["target_mbart_lang"] = target_mbart

    # ------------------------------
    # Detect source language
    # ------------------------------
    src_resp = detect_language(content)
    src_iso = src_resp.data.get("language", DEFAULT_LANG)
    src_mbart = get_mbart_lang(src_iso)

    meta["source_language"] = src_iso
    meta["source_mbart_lang"] = src_mbart
    meta["language_detection"] = src_resp.meta

    # Short-circuit: same language (no translation needed)
    if src_iso == target_iso:
        return AIResponse(
            status="ok",
            data={"translation": content, "language": target_iso},
            errors=None,
            meta={**meta, "method": "noop"},
        )

    # ------------------------------
    # Primary: mBART Translation
    # ------------------------------
    try:
        tokenizer = get_tokenizer(TRANSLATION_MODEL_KEY)
        translator = get_translator()

        sentences = _split_sentences(content)
        translated: List[str] = []

        for sentence in sentences:
            if not sentence.strip():
                translated.append("")
                continue

            tokens = tokenizer.encode(
                sentence,
                truncation=True,
                max_length=TRANSLATION_TOKEN_LIMIT,
            )
            safe_text = tokenizer.decode(tokens, skip_special_tokens=True)

            result = translator(
                safe_text,
                src_lang=src_mbart,
                tgt_lang=target_mbart,
            )

            translated.append(result[0].get("translation_text", safe_text))

        return AIResponse(
            status="ok",
            data={"translation": " ".join(translated), "language": target_iso},
            errors=None,
            meta={**meta, "method": "mt"},
        )

    except Exception as e:
        logger.warning(f"mBART translation failed, falling back to LLM: {e}")
        errors.append(f"MT failed: {e}")

    # ------------------------------
    # Fallback: Mistral LLM Translation
    # ------------------------------
    try:
        prompt = get_translation_prompt(content, target_iso)

        llm_response = run_llm_json(
            prompt=prompt,
            model=LLM_MODEL_KEY,
            max_new_tokens=512,
            max_prompt_tokens=384,
            temperature=0.0,
            do_sample=False,
            meta={"analysis_type": "translation"},
        )

        return AIResponse(
            status="partial",
            data={
                "translation": llm_response.data["translation"],
                "language": target_iso,
            },
            errors=errors,
            meta={**meta, "method": "llm_fallback"},
        )

    except Exception as e:
        errors.append(f"LLM failed: {e}")
        return AIResponse(
            status="error",
            data={"translation": content, "language": target_iso},
            errors=errors,
            meta=meta,
        )
