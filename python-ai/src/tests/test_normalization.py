import pytest
from src.ai.services import normalize
from src.ai.types import AIResponse

# ------------------------------
# Basic HTML normalization
# ------------------------------
def test_normalize_article_basic():
    """
    Test normalization of simple HTML content.
    Checks that output contains either a summary or extracted tags.
    """
    html_content = "<p>Hello world!</p>"
    result = normalize.normalize_and_translate_article(
        raw_html=html_content,
        target_language="en"
    )

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}
    assert "summary" in result.data or "tags" in result.data

# ------------------------------
# Empty HTML
# ------------------------------
def test_normalize_article_empty():
    """
    Empty HTML content should return partial or error status.
    """
    html_content = ""
    result = normalize.normalize_and_translate_article(
        raw_html=html_content,
        target_language="en"
    )

    assert isinstance(result, AIResponse)
    assert result.status in {"partial", "error"}

# ------------------------------
# Large HTML content
# ------------------------------
def test_normalize_article_large():
    """
    Test normalization with a large HTML document to ensure performance and stability.
    """
    html_content = "<p>Sentence.</p>" * 5000
    result = normalize.normalize_and_translate_article(
        raw_html=html_content,
        target_language="en"
    )

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}
    assert "summary" in result.data or "tags" in result.data

# ------------------------------
# Non-English HTML content
# ------------------------------
def test_normalize_article_translation():
    """
    Non-English content should be normalized and translated to the target language.
    """
    html_content = "<p>Bonjour le monde!</p>"
    result = normalize.normalize_and_translate_article(
        raw_html=html_content,
        target_language="en"
    )

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}
    # Check that the summary or tags are present
    assert "summary" in result.data or "tags" in result.data
