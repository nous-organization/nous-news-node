"""
Tests for antithesis generation.

These tests verify the antithesis service's ability to generate
structured antitheses for different types of input.
"""

import pytest
from unittest.mock import patch
from ai.services import antithesis


# ------------------------------
# Basic antithesis generation (mocked)
# ------------------------------
@patch("ai.services.antithesis.run_llm_json")
def test_antithesis_basic(mock_llm):
    """
    Test antithesis generation for a normal sentence.
    """
    mock_llm.return_value = {"antithesis": "Technology is making life worse.", "meta": {"mocked": True}}

    text = "Technology is making life better."
    result = antithesis.generate_antithesis(text)

    # Validate structure
    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "error", "partial"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "antithesis" in result["data"] and isinstance(result["data"]["antithesis"], str)
    assert len(result["data"]["antithesis"]) > 0
    assert "errors" in result
    assert "meta" in result


# ------------------------------
# Short input
# ------------------------------
@patch("ai.services.antithesis.run_llm_json")
def test_antithesis_short_text(mock_llm):
    """
    Short or single-word input should still produce a string response.
    """
    mock_llm.return_value = {"antithesis": "War", "meta": {"mocked": True}}

    text = "Peace"
    result = antithesis.generate_antithesis(text)

    assert isinstance(result, dict)
    assert "data" in result and "antithesis" in result["data"]
    assert isinstance(result["data"]["antithesis"], str)


# ------------------------------
# Empty input
# ------------------------------
@patch("ai.services.antithesis.run_llm_json")
def test_antithesis_empty_input(mock_llm):
    """
    Empty input should not break the service and should return an error or empty antithesis.
    """
    mock_llm.return_value = {"antithesis": "", "meta": {"mocked": True}}

    text = ""
    result = antithesis.generate_antithesis(text)

    assert isinstance(result, dict)
    assert "data" in result and "antithesis" in result["data"]
    assert isinstance(result["data"]["antithesis"], str)


# ------------------------------
# Long input
# ------------------------------
@patch("ai.services.antithesis.run_llm_json")
def test_antithesis_long_text(mock_llm):
    """
    Very long input should return a valid antithesis string.
    """
    mock_llm.return_value = {"antithesis": "Paragraph collapsed into contrast.", "meta": {"mocked": True}}

    text = "Sentence. " * 5000  # simulate a long paragraph
    result = antithesis.generate_antithesis(text)

    assert isinstance(result, dict)
    assert "data" in result and "antithesis" in result["data"]
    assert isinstance(result["data"]["antithesis"], str)
    assert len(result["data"]["antithesis"]) > 0
