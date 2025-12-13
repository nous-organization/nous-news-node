import pytest

from ai.types import AIResponse
from ai import (
    analyze_article,
    antithesis,
    cognitive_bias,
    philosophical,
    political_bias,
    sentiment,
    summarization,
    translate,
)
from ai.utils import tokenizer

# ------------------------------
# 1. Tokenizer
# ------------------------------
def test_tokenizer_encode_decode():
    text = "Hello world!"
    tokens = tokenizer.encode(text)
    decoded = tokenizer.decode(tokens)

    assert isinstance(tokens, list)
    assert isinstance(decoded, str)
    assert "hello" in decoded.lower()


# ------------------------------
# 2. Sentiment
# ------------------------------
def test_sentiment_analysis():
    text = "I love programming!"
    result = sentiment.analyze_sentiment(text)

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}
    assert "sentiment" in result.data
    assert result.data["sentiment"] in {
        "positive", "neutral", "negative", "unknown"
    }


# ------------------------------
# 3. Cognitive bias
# ------------------------------
def test_cognitive_bias_detection():
    text = "The government always does the right thing."
    response = cognitive_bias.detect_cognitive_bias(text)

    assert isinstance(response, AIResponse)
    assert isinstance(response.data, list)


# ------------------------------
# 4. Summarization
# ------------------------------
def test_summarization_basic():
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


def test_summarization_truncation():
    long_text = "Sentence. " * 10_000
    result = summarization.summarize(long_text)

    assert isinstance(result, AIResponse)
    assert "summary" in result.data
    assert isinstance(result.data["summary"], str)


# ------------------------------
# 5. Antithesis
# ------------------------------
def test_antithesis_generation():
    text = "Technology is making life better."
    result = antithesis.generate_antithesis(text)

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "error"}
    assert "antithesis" in result.data
    assert isinstance(result.data["antithesis"], str)


# ------------------------------
# 6. Philosophy
# ------------------------------
def test_philosophy_analysis():
    text = "What is the meaning of life?"
    result = philosophical.generate_philosophical_insight(text)

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}
    assert isinstance(result.data, dict)


# ------------------------------
# 7. Political bias
# ------------------------------
def test_political_bias_detection():
    text = "The new tax policy benefits the wealthy."
    result = political_bias.detect_political_bias(text)

    assert isinstance(result, AIResponse)
    assert "political_bias" in result.data
    assert result.data["political_bias"] in {
        "left", "center", "right", "uncertain"
    }


# ------------------------------
# 8. Translation
# ------------------------------
def test_translation_basic():
    text = "Hello world"
    result = translate.translate(text, target_language="es")

    assert isinstance(result, AIResponse)
    assert "translation" in result.data
    assert isinstance(result.data["translation"], str)
    assert result.data["language"] == "es"


def test_translation_noop_same_language():
    text = "Hello world"
    result = translate.translate(text, target_language="en")

    assert isinstance(result, AIResponse)
    assert result.data["translation"] == text


# ------------------------------
# 9. Analyze article (full pipeline)
# ------------------------------
def test_analyze_article_pipeline():
    article = {
        "content": "The company announced a new product that will revolutionize AI."
    }

    result = analyze_article.analyze_article(article)

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}

    data = result.data
    assert "sentiment" in data
    assert "political_bias" in data
    assert "cognitive_biases" in data
    assert "antithesis" in data
    assert "philosophical" in data
