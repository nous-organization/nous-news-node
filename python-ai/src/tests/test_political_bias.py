import pytest
from ai.services import political_bias

# Allowed political bias values
POLITICAL_BIAS_VALUES = {"left", "center", "right", "uncertain"}

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

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "errors" in result
    assert "meta" in result

    assert "political_bias" in result["data"]
    assert result["data"]["political_bias"] in POLITICAL_BIAS_VALUES


# ------------------------------
# Political bias detection with neutral text
# ------------------------------
def test_political_bias_neutral():
    text = "The sky is blue and water is wet."
    result = political_bias.detect_political_bias(text)

    assert isinstance(result, dict)
    assert "data" in result and isinstance(result["data"], dict)
    assert "political_bias" in result["data"]
    assert result["data"]["political_bias"] in POLITICAL_BIAS_VALUES


# ------------------------------
# Political bias detection with left-leaning text
# ------------------------------
def test_political_bias_left_leaning():
    text = "We need to increase social welfare and healthcare access for all."
    result = political_bias.detect_political_bias(text)

    assert isinstance(result, dict)
    assert "data" in result and isinstance(result["data"], dict)
    assert "political_bias" in result["data"]
    assert result["data"]["political_bias"] in POLITICAL_BIAS_VALUES


# ------------------------------
# Political bias detection with right-leaning text
# ------------------------------
def test_political_bias_right_leaning():
    text = "Lowering taxes encourages business growth and innovation."
    result = political_bias.detect_political_bias(text)

    assert isinstance(result, dict)
    assert "data" in result and isinstance(result["data"], dict)
    assert "political_bias" in result["data"]
    assert result["data"]["political_bias"] in POLITICAL_BIAS_VALUES


# ------------------------------
# Political bias detection with empty input
# ------------------------------
def test_political_bias_empty():
    text = ""
    result = political_bias.detect_political_bias(text)

    assert isinstance(result, dict)
    assert "data" in result and isinstance(result["data"], dict)
    assert "political_bias" in result["data"]
    assert result["data"]["political_bias"] in POLITICAL_BIAS_VALUES
