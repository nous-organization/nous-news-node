"""
normalize.py

Full AI-enhanced article normalization pipeline with optional translation,
summarization, and tag extraction.
"""

from typing import Optional, List, Dict

from .summarization import summarize
from .translation import translate
from .extract_tags_ai import extract_tags_ai
from .utils.clean_html import clean_html  # adjust if needed

NormalizedArticleResults = Dict[str, Optional[object]]


# ------------------------------------------------------------
# Normalize without translation
# ------------------------------------------------------------
async def normalize_article_ai(raw_html: str) -> NormalizedArticleResults:
    errors: List[str] = []

    # 0. Clean HTML
    content = clean_html(raw_html)

    # --------------------------------------------------------
    # 1. Summarization
    # --------------------------------------------------------
    summary = ""
    try:
        result = await summarize(content)
        summary = result.get("data") or ""
        if result.get("errors"):
            errors.extend(result["errors"])
    except Exception as e:
        msg = str(e) or "Unknown summarization error"
        print(f"[normalize_article_ai] summarization failed: {msg}")
        summary = " ".join(content.split(".")[:3])
        errors.append(msg)

    # --------------------------------------------------------
    # 2. Tag extraction
    # --------------------------------------------------------
    tags: List[str] = []
    try:
        tag_result = await extract_tags_ai(content)
        tags = tag_result.get("data") or []
        if tag_result.get("errors"):
            errors.extend(tag_result["errors"])
    except Exception as e:
        msg = str(e) or "Unknown tag extraction error"
        print(f"[normalize_article_ai] tag extraction failed: {msg}")
        errors.append(msg)

    # --------------------------------------------------------
    # Status logic
    # --------------------------------------------------------
    status = "success"
    if errors and (summary or tags):
        status = "partial"
    elif errors and not (summary or tags):
        status = "error"

    return {
        "content": content,
        "summary": summary,
        "tags": tags,
        "errors": errors if errors else None,
        "status": status,
    }


# ------------------------------------------------------------
# Normalize + Translate
# ------------------------------------------------------------
async def normalize_and_translate_article(
    raw_html: str,
    target_language: str = "en",
) -> NormalizedArticleResults:
    errors: List[str] = []
    content = clean_html(raw_html)

    translation: Optional[str] = None
    language: Optional[str] = None

    # --------------------------------------------------------
    # 1. Translation
    # --------------------------------------------------------
    try:
        result = await translate(content, target_language)
        translation = result.get("translation") or content
        language = result.get("language")
        if result.get("errors"):
            errors.extend(result["errors"])
    except Exception as e:
        msg = str(e) or "Unknown translation error"
        print(f"[normalize_and_translate_article] translation failed: {msg}")
        translation = content
        errors.append(msg)

    effective_text = translation or content

    # --------------------------------------------------------
    # 2. Summarization
    # --------------------------------------------------------
    summary = ""
    try:
        sum_result = await summarize(effective_text)
        summary = sum_result.get("data") or ""
        if sum_result.get("errors"):
            errors.extend(sum_result["errors"])
    except Exception as e:
        msg = str(e) or "Unknown summarization error"
        print(f"[normalize_and_translate_article] summarization failed: {msg}")
        summary = " ".join(effective_text.split(".")[:3])
        errors.append(msg)

    # --------------------------------------------------------
    # 3. Tag extraction
    # --------------------------------------------------------
    tags: List[str] = []
    try:
        tag_result = await extract_tags_ai(effective_text)
        tags = tag_result.get("data") or []
        if tag_result.get("errors"):
            errors.extend(tag_result["errors"])
    except Exception as e:
        msg = str(e) or "Unknown tag extraction error"
        print(f"[normalize_and_translate_article] tag extraction failed: {msg}")
        errors.append(msg)

    # --------------------------------------------------------
    # Status logic
    # --------------------------------------------------------
    status = "success"
    if errors and (translation or summary or tags):
        status = "partial"
    elif errors and not (translation or summary or tags):
        status = "error"

    return {
        "content": effective_text,
        "summary": summary,
        "tags": tags,
        "language": language,
        "errors": errors if errors else None,
        "status": status,
    }
