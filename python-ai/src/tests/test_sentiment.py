import pytest
from ai.services import sentiment

# Allowed sentiment values
SENTIMENT_VALUES = {"positive", "neutral", "negative", "unknown"}

# ------------------------------
# Positive sentiment
# ------------------------------
def test_sentiment_analysis_positive():
    """
    Ensure that positive sentiment is correctly detected.
    """
    text = "I love programming!"
    result = sentiment.analyze_sentiment(text)

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "errors" in result
    assert "meta" in result
    assert "sentiment" in result["data"]
    assert result["data"]["sentiment"] in SENTIMENT_VALUES


# ------------------------------
# Negative sentiment
# ------------------------------
def test_sentiment_analysis_negative():
    """
    Ensure that negative sentiment is correctly detected.
    """
    text = "I hate waiting in line."
    result = sentiment.analyze_sentiment(text)

    assert isinstance(result, dict)
    assert "data" in result and isinstance(result["data"], dict)
    assert "sentiment" in result["data"]
    assert result["data"]["sentiment"] in SENTIMENT_VALUES


# ------------------------------
# Neutral sentiment
# ------------------------------
def test_sentiment_analysis_neutral():
    """
    Ensure that neutral sentiment is correctly detected for factual text.
    """
    text = "The cat is on the mat."
    result = sentiment.analyze_sentiment(text)

    assert isinstance(result, dict)
    assert "data" in result and isinstance(result["data"], dict)
    assert "sentiment" in result["data"]
    assert result["data"]["sentiment"] in SENTIMENT_VALUES


# ------------------------------
# Empty input
# ------------------------------
def test_sentiment_analysis_empty():
    """
    Empty input should return 'unknown' or partial status.
    """
    text = ""
    result = sentiment.analyze_sentiment(text)

    assert isinstance(result, dict)
    assert "status" in result and result["status"] in {"ok", "partial", "error"}
    assert "data" in result and isinstance(result["data"], dict)
    assert "sentiment" in result["data"]
    assert result["data"]["sentiment"] in SENTIMENT_VALUES
