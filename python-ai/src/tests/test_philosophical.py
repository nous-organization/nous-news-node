import pytest
from src.ai.services import philosophical
from src.ai.types import AIResponse

# ------------------------------
# Basic philosophical insight
# ------------------------------
def test_philosophy_analysis_basic():
    """
    Test generation of philosophical insight for a simple question.

    This test checks the basic functionality of the `generate_philosophical_insight` function
    by providing a simple question, "What is the meaning of life?", and verifying that the
    result is a valid `AIResponse` object with the expected status, data format, and presence
    of an 'insight' key or non-empty data.

    Asserts:
        - Result is an instance of AIResponse.
        - Status is either "ok" or "partial".
        - Data is a dictionary.
        - The dictionary contains 'insight' or is non-empty.
    """
    text = "What is the meaning of life?"
    result = philosophical.generate_philosophical_insight(text)

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}
    assert isinstance(result.data, dict)
    assert "insight" in result.data or len(result.data) > 0


# ------------------------------
# Empty input
# ------------------------------
def test_philosophy_analysis_empty():
    """
    Test handling of empty input.

    This test checks the behavior of the `generate_philosophical_insight` function when given
    an empty input string. The function should return an `AIResponse` with a "partial" or
    "error" status and an empty or error-filled data field.

    Asserts:
        - Result is an instance of AIResponse.
        - Status is either "partial" or "error".
        - Data is a dictionary.
    """
    text = ""
    result = philosophical.generate_philosophical_insight(text)

    assert isinstance(result, AIResponse)
    assert result.status in {"partial", "error"}
    assert isinstance(result.data, dict)


# ------------------------------
# Complex question
# ------------------------------
def test_philosophy_analysis_complex():
    """
    Test generation of philosophical insight for a complex question.

    This test checks the ability of the `generate_philosophical_insight` function to handle
    more complex philosophical questions, such as "How does consciousness relate to free will?".
    It verifies that the result is a valid `AIResponse` and contains meaningful data.

    Asserts:
        - Result is an instance of AIResponse.
        - Status is either "ok" or "partial".
        - Data is a dictionary.
        - The dictionary contains 'insight' or is non-empty.
    """
    text = "How does consciousness relate to free will?"
    result = philosophical.generate_philosophical_insight(text)

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}
    assert isinstance(result.data, dict)
    assert "insight" in result.data or len(result.data) > 0
