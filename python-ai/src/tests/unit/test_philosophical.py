"""
Tests for insight generation.

These tests verify the insight service's ability to generate
structured insights for various types of questions.
"""

import pytest
from unittest.mock import patch
from ai.services import philosophical


# ------------------------------
# Basic insight (mocked)
# ------------------------------
@patch("ai.services.philosophical.run_llm_json")
def test_insight_analysis_basic(mock_llm):
    """
    Test generation of insight for a simple question using a mocked LLM.

    Validates that the function correctly returns a structured AIResponse dict.
    """
    mock_llm.return_value = {
        "insight": "Life is meaningful in seeking purpose.",
        "meta": {"mocked": True}
    }

    text = "What is the meaning of life?"
    result = philosophical.generate_philosophical_insight(text)

    # Validate structure
    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "errors" in result
    assert "meta" in result
    # Optional: check that insight exists in data
    assert "insight" in result["data"] or len(result["data"]) > 0


# ------------------------------
# Empty input
# ------------------------------
def test_insight_analysis_empty():
    """
    Test handling of empty input.
    """
    text = ""
    result = philosophical.generate_philosophical_insight(text)

    assert isinstance(result, dict)
    assert result["status"] in {"partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "errors" in result
    assert "meta" in result


# ------------------------------
# Complex question (slow)
# ------------------------------
@pytest.mark.slow
@pytest.mark.timeout(600)
@patch("ai.services.philosophical.run_llm_json")
def test_insight_analysis_complex(mock_llm):
    """
    Test generation of insight for a complex question using mocked LLM.
    """
    mock_llm.return_value = {
        "insight": "Consciousness informs free will, but constraints exist.",
        "meta": {"mocked": True}
    }

    text = "How does consciousness relate to free will?"
    result = philosophical.generate_philosophical_insight(text)

    assert isinstance(result, dict)
    assert result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "errors" in result
    assert "meta" in result
    assert "insight" in result["data"] or len(result["data"]) > 0


# ------------------------------
# Lightweight prompt
# ------------------------------
@patch("ai.services.philosophical.run_llm_json")
def test_insight_analysis_lightweight(mock_llm):
    """
    Fast test using a short prompt suitable for lightweight models.
    """
    mock_llm.return_value = {
        "insight": "Truth is the correspondence between beliefs and reality.",
        "meta": {"mocked": True}
    }

    text = "What is truth?"
    result = philosophical.generate_philosophical_insight(text)

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "errors" in result
    assert "meta" in result
    assert "insight" in result["data"] or len(result["data"]) > 0
