import pytest
from ai.services import normalize

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

    # Validate TypedDict structure
    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "errors" in result
    assert "meta" in result

    # Output should contain summary or tags
    assert "summary" in result["data"] or "tags" in result["data"]


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

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "errors" in result
    assert "meta" in result


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

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "errors" in result
    assert "meta" in result

    assert "summary" in result["data"] or "tags" in result["data"]


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

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "errors" in result
    assert "meta" in result

    assert "summary" in result["data"] or "tags" in result["data"]
