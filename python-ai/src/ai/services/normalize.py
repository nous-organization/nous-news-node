"""
normalize.py

Full article normalization pipeline.

Steps:
1) Clean HTML
2) Optional translation
3) Summarization
4) Tag extraction

This module orchestrates AI services but does not run models directly.
"""

from typing import List

from ..types import AIResponse
from ..utils.clean_html import clean_html
from .summarization import summarize
from .translate import translate
from .extract_tags import extract_tags


# ------------------------------------------------------------
# Normalize without translation
# ------------------------------------------------------------
def normalize_article(raw_html: str) -> AIResponse:
    errors: List[str] = []

    # --------------------------------------------------------
    # 0. Clean HTML
    # --------------------------------------------------------
    content = clean_html(raw_html)

    # --------------------------------------------------------
    # 1. Summarization
    # --------------------------------------------------------
    summary = ""
    try:
        result = summarize(content)
        summary = result.data.get("summary", "")
        if result.errors:
            errors.extend(result.errors)
    except Exception as e:
        msg = str(e) or "Summarization failed"
        errors.append(msg)
        summary = " ".join(content.split(".")[:3])

    # --------------------------------------------------------
    # 2. Tag extraction
    # --------------------------------------------------------
    tags: List[str] = []
    try:
        tag_result = extract_tags(content)
        tags = tag_result.data or []
        if tag_result.errors:
            errors.extend(tag_result.errors)
    except Exception as e:
        msg = str(e) or "Tag extraction failed"
        errors.append(msg)

    # --------------------------------------------------------
    # Status logic
    # --------------------------------------------------------
    if errors and (summary or tags):
        status = "partial"
    elif errors:
        status = "error"
    else:
        status = "ok"

    return AIResponse(
        status=status,
        data={
            "content": content,
            "summary": summary,
            "tags": tags,
        },
        errors=errors or None,
        meta=None,
    )


# ------------------------------------------------------------
# Normalize + Translate
# ------------------------------------------------------------
def normalize_and_translate_article(
    raw_html: str,
    target_language: str = "en",
) -> AIResponse:
    errors: List[str] = []

    # --------------------------------------------------------
    # 0. Clean HTML
    # --------------------------------------------------------
    content = clean_html(raw_html)

    translation = content
    language = target_language

    # --------------------------------------------------------
    # 1. Translation
    # --------------------------------------------------------
    try:
        result = translate(content, target_language)
        translation = result.data.get("translation", content)
        language = result.data.get("language", target_language)
        if result.errors:
            errors.extend(result.errors)
    except Exception as e:
        msg = str(e) or "Translation failed"
        errors.append(msg)

    effective_text = translation

    # --------------------------------------------------------
    # 2. Summarization
    # --------------------------------------------------------
    summary = ""
    try:
        sum_result = summarize(effective_text)
        summary = sum_result.data.get("summary", "")
        if sum_result.errors:
            errors.extend(sum_result.errors)
    except Exception as e:
        msg = str(e) or "Summarization failed"
        errors.append(msg)
        summary = " ".join(effective_text.split(".")[:3])

    # --------------------------------------------------------
    # 3. Tag extraction
    # --------------------------------------------------------
    tags: List[str] = []
    try:
        tag_result = extract_tags(effective_text)
        tags = tag_result.data or []
        if tag_result.errors:
            errors.extend(tag_result.errors)
    except Exception as e:
        msg = str(e) or "Tag extraction failed"
        errors.append(msg)

    # --------------------------------------------------------
    # Status logic
    # --------------------------------------------------------
    if errors and (translation or summary or tags):
        status = "partial"
    elif errors:
        status = "error"
    else:
        status = "ok"

    return AIResponse(
        status=status,
        data={
            "content": effective_text,
            "summary": summary,
            "tags": tags,
            "language": language,
        },
        errors=errors or None,
        meta=None,
    )
