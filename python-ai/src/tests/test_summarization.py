import pytest
from src.ai.services import summarization
from src.ai.types import AIResponse

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

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}
    assert "summary" in result.data
    assert isinstance(result.data["summary"], str)
    assert len(result.data["summary"]) > 0

# ------------------------------
# Very long text (truncation / batching)
# ------------------------------
def test_summarization_truncation():
    """
    Test summarization on very long text to ensure no errors and valid output.
    """
    long_text = "Sentence. " * 10_000
    result = summarization.summarize(long_text)

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}
    assert "summary" in result.data
    assert isinstance(result.data["summary"], str)
    assert len(result.data["summary"]) > 0

# ------------------------------
# Empty input
# ------------------------------
def test_summarization_empty():
    """
    Ensure summarization handles empty input gracefully.
    """
    empty_text = ""
    result = summarization.summarize(empty_text)

    assert isinstance(result, AIResponse)
    assert result.status in {"partial", "ok"}
    assert "summary" in result.data
    assert result.data["summary"] == ""

# ------------------------------
# Very short text (single sentence)
# ------------------------------
def test_summarization_short_text():
    """
    Summarization of a very short text should return the same or minimally altered text.
    """
    short_text = "Python is great."
    result = summarization.summarize(short_text)

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}
    assert "summary" in result.data
    assert isinstance(result.data["summary"], str)
    assert len(result.data["summary"]) > 0
