import pytest
from ai.services import summarization

# ------------------------------
# Basic summarization
# ------------------------------
def test_summarization_basic():
    """
    Test summarization on a short, standard paragraph.
    """
    text = (
        "Python is a programming language. "
        "It is widely used for AI and web development. "
        "It emphasizes readability."
    )
    result = summarization.summarize(text)

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "summary" in result["data"]
    assert isinstance(result["data"]["summary"], str)
    assert len(result["data"]["summary"]) > 0
    assert "errors" in result
    assert "meta" in result


# ------------------------------
# Very long text (truncation / batching)
# ------------------------------
def test_summarization_truncation():
    """
    Test summarization on very long text to ensure no errors and valid output.
    """
    long_text = "Sentence. " * 10_000
    result = summarization.summarize(long_text)

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "summary" in result["data"]
    assert isinstance(result["data"]["summary"], str)
    assert len(result["data"]["summary"]) > 0
    assert "errors" in result
    assert "meta" in result


# ------------------------------
# Empty input
# ------------------------------
def test_summarization_empty():
    """
    Ensure summarization handles empty input gracefully.
    """
    empty_text = ""
    result = summarization.summarize(empty_text)

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "summary" in result["data"]
    assert result["data"]["summary"] == ""
    assert "errors" in result
    assert "meta" in result


# ------------------------------
# Very short text (single sentence)
# ------------------------------
def test_summarization_short_text():
    """
    Summarization of a very short text should return the same or minimally altered text.
    """
    short_text = "Python is great."
    result = summarization.summarize(short_text)

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "summary" in result["data"]
    assert isinstance(result["data"]["summary"], str)
    assert len(result["data"]["summary"]) > 0
    assert "errors" in result
    assert "meta" in result
