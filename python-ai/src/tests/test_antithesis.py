import pytest
from src.ai.services import antithesis
from src.ai.types import AIResponse

# ------------------------------
# Basic antithesis generation
# ------------------------------
def test_antithesis_basic():
    """
    Test antithesis generation for a normal sentence.
    """
    text = "Technology is making life better."
    result = antithesis.generate_antithesis(text)

    assert isinstance(result, AIResponse), "Result must be an AIResponse instance."
    assert result.status in {"ok", "error"}, f"Unexpected status: {result.status}"
    assert "antithesis" in result.data, "Response data must contain 'antithesis'."
    assert isinstance(result.data["antithesis"], str)
    assert len(result.data["antithesis"]) > 0, "Antithesis should not be empty."

# ------------------------------
# Antithesis with short text
# ------------------------------
def test_antithesis_short_text():
    """
    Short or single-word input should still produce a string response.
    """
    text = "Peace"
    result = antithesis.generate_antithesis(text)

    assert isinstance(result, AIResponse)
    assert "antithesis" in result.data
    assert isinstance(result.data["antithesis"], str)

# ------------------------------
# Antithesis with empty string
# ------------------------------
def test_antithesis_empty_input():
    """
    Empty input should not break the service and should return an error or empty antithesis.
    """
    text = ""
    result = antithesis.generate_antithesis(text)

    assert isinstance(result, AIResponse)
    assert "antithesis" in result.data
    assert isinstance(result.data["antithesis"], str)

# ------------------------------
# Antithesis with long input
# ------------------------------
def test_antithesis_long_text():
    """
    Very long input should return a valid antithesis string.
    """
    text = "Sentence. " * 5000  # simulate a long paragraph
    result = antithesis.generate_antithesis(text)

    assert isinstance(result, AIResponse)
    assert "antithesis" in result.data
    assert isinstance(result.data["antithesis"], str)
    assert len(result.data["antithesis"]) > 0
