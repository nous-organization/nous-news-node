import pytest
from ai.services import antithesis

# ------------------------------
# Basic antithesis generation
# ------------------------------
def test_antithesis_basic():
    """
    Test antithesis generation for a normal sentence.
    """
    text = "Technology is making life better."
    result = antithesis.generate_antithesis(text)

    # Validate structure instead of isinstance
    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "error", "partial"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "antithesis" in result["data"] and isinstance(result["data"]["antithesis"], str)
    assert len(result["data"]["antithesis"]) > 0
    assert "errors" in result
    assert "meta" in result


# ------------------------------
# Antithesis with short text
# ------------------------------
def test_antithesis_short_text():
    """
    Short or single-word input should still produce a string response.
    """
    text = "Peace"
    result = antithesis.generate_antithesis(text)

    assert isinstance(result, dict)
    assert "data" in result and "antithesis" in result["data"]
    assert isinstance(result["data"]["antithesis"], str)


# ------------------------------
# Antithesis with empty string
# ------------------------------
def test_antithesis_empty_input():
    """
    Empty input should not break the service and should return an error or empty antithesis.
    """
    text = ""
    result = antithesis.generate_antithesis(text)

    assert isinstance(result, dict)
    assert "data" in result and "antithesis" in result["data"]
    assert isinstance(result["data"]["antithesis"], str)


# ------------------------------
# Antithesis with long input
# ------------------------------
def test_antithesis_long_text():
    """
    Very long input should return a valid antithesis string.
    """
    text = "Sentence. " * 5000  # simulate a long paragraph
    result = antithesis.generate_antithesis(text)

    assert isinstance(result, dict)
    assert "data" in result and "antithesis" in result["data"]
    assert isinstance(result["data"]["antithesis"], str)
    assert len(result["data"]["antithesis"]) > 0
