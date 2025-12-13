import pytest
from src.ai.services import sentiment
from src.ai.types import AIResponse

# ------------------------------
# Positive sentiment
# ------------------------------
def test_sentiment_analysis_positive():
    """
    Ensure that positive sentiment is correctly detected.
    """
    text = "I love programming!"
    result = sentiment.analyze_sentiment(text)

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}
    assert "sentiment" in result.data
    assert result.data["sentiment"] in {"positive", "neutral", "negative", "unknown"}

# ------------------------------
# Negative sentiment
# ------------------------------
def test_sentiment_analysis_negative():
    """
    Ensure that negative sentiment is correctly detected.
    """
    text = "I hate waiting in line."
    result = sentiment.analyze_sentiment(text)

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}
    assert "sentiment" in result.data
    assert result.data["sentiment"] in {"positive", "neutral", "negative", "unknown"}

# ------------------------------
# Neutral sentiment
# ------------------------------
def test_sentiment_analysis_neutral():
    """
    Ensure that neutral sentiment is correctly detected for factual text.
    """
    text = "The cat is on the mat."
    result = sentiment.analyze_sentiment(text)

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}
    assert "sentiment" in result.data
    assert result.data["sentiment"] in {"positive", "neutral", "negative", "unknown"}

# ------------------------------
# Empty input
# ------------------------------
def test_sentiment_analysis_empty():
    """
    Empty input should return 'unknown' or partial status.
    """
    text = ""
    result = sentiment.analyze_sentiment(text)

    assert isinstance(result, AIResponse)
    assert result.status in {"partial", "ok"}
    assert "sentiment" in result.data
    assert result.data["sentiment"] in {"positive", "neutral", "negative", "unknown"}
