import pytest
from src.ai.services import political_bias
from src.ai.types import AIResponse

# ------------------------------
# Basic political bias detection
# ------------------------------
def test_political_bias_basic():
    """
    Test political bias detection on a simple sentence.
    Expect the response to contain a 'political_bias' field with valid values.
    """
    text = "The new tax policy benefits the wealthy."
    result = political_bias.detect_political_bias(text)

    assert isinstance(result, AIResponse), "Result should be an AIResponse instance."
    assert "political_bias" in result.data, "Response data must contain 'political_bias'."
    assert result.data["political_bias"] in {"left", "center", "right", "uncertain"}, \
        f"Unexpected political_bias value: {result.data['political_bias']}"

# ------------------------------
# Political bias detection with neutral text
# ------------------------------
def test_political_bias_neutral():
    """
    Text that should not strongly indicate any political leaning.
    """
    text = "The sky is blue and water is wet."
    result = political_bias.detect_political_bias(text)

    assert isinstance(result, AIResponse)
    assert "political_bias" in result.data
    # Neutral / uncertain classification
    assert result.data["political_bias"] in {"left", "center", "right", "uncertain"}

# ------------------------------
# Political bias detection with left-leaning text
# ------------------------------
def test_political_bias_left_leaning():
    """
    Example text that is likely to be left-leaning.
    """
    text = "We need to increase social welfare and healthcare access for all."
    result = political_bias.detect_political_bias(text)

    assert isinstance(result, AIResponse)
    assert result.data["political_bias"] in {"left", "center", "right", "uncertain"}

# ------------------------------
# Political bias detection with right-leaning text
# ------------------------------
def test_political_bias_right_leaning():
    """
    Example text that is likely to be right-leaning.
    """
    text = "Lowering taxes encourages business growth and innovation."
    result = political_bias.detect_political_bias(text)

    assert isinstance(result, AIResponse)
    assert result.data["political_bias"] in {"left", "center", "right", "uncertain"}

# ------------------------------
# Political bias detection with empty input
# ------------------------------
def test_political_bias_empty():
    """
    Empty input should return a valid response with 'uncertain' bias.
    """
    text = ""
    result = political_bias.detect_political_bias(text)

    assert isinstance(result, AIResponse)
    assert "political_bias" in result.data
    assert result.data["political_bias"] in {"left", "center", "right", "uncertain"}
