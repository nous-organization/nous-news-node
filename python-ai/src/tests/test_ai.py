import pytest
import asyncio
from ai import (
    analyze_article,
    antithesis,
    cognitive_bias,
    philosophy,
    political_bias,
    sentiment,
    summarization,
    tokenizer,
    translate
)

# ------------------------------
# 1. Tokenizer
# ------------------------------
def test_tokenizer_encode_decode():
    text = "Hello world!"
    tokens = tokenizer.encode(text)
    decoded = tokenizer.decode(tokens)
    assert isinstance(tokens, list)
    assert isinstance(decoded, str)
    assert "Hello" in decoded

# ------------------------------
# 2. Sentiment
# ------------------------------
def test_sentiment_analysis():
    text = "I love programming!"
    result = sentiment.analyze_sentiment(text)
    assert isinstance(result, dict)
    assert "data" in result
    assert "sentiment" in result["data"]

# ------------------------------
# 3. Cognitive bias
# ------------------------------
def test_cognitive_bias_detection():
    text = "The government always does the right thing."
    response = cognitive_bias.detect_cognitive_bias(text)
    assert isinstance(response, dict)
    assert "data" in response
    assert isinstance(response["data"], list)

# ------------------------------
# 4. Summarization
# ------------------------------
def test_summarization():
    text = "Python is a programming language. It is widely used for AI and web development."
    summary = summarization.summarize(text)
    assert isinstance(summary["data"], dict)
    assert "summary" in summary["data"]
    assert isinstance(summary["data"]["summary"], str)


# ------------------------------
# 5. Antithesis
# ------------------------------
def test_antithesis_generation():
    text = "Technology is making life better."
    result = antithesis.generate_antithesis(text)
    assert isinstance(result, dict)
    assert "data" in result
    assert "summary" in result["data"]

# ------------------------------
# 6. Philosophy
# ------------------------------
def test_philosophy_analysis():
    text = "What is the meaning of life?"
    result = philosophy.generate_philosophical_insight(text)
    assert isinstance(result, dict)
    assert "data" in result
    assert "insight" in result["data"]

# ------------------------------
# 7. Political bias
# ------------------------------
def test_political_bias_detection():
    text = "The new tax policy benefits the wealthy."
    result = political_bias.detect_political_bias(text)
    assert isinstance(result, dict)
    assert "data" in result
    assert "political_bias" in result["data"]

# ------------------------------
# 8. Translation
# ------------------------------
def test_translation():
    text = "Hello world"
    translated = translate.translate(text, target_language="es")
    assert isinstance(translated, dict)
    assert "translation" in translated
    assert isinstance(translated["translation"], str)

# ------------------------------
# 9. Analyze article (full pipeline)
# ------------------------------
def test_analyze_article_pipeline():
    article = {"content": "The company announced a new product that will revolutionize AI."}
    analysis = analyze_article.analyze_article(article)
    assert isinstance(analysis, dict)
    assert "data" in analysis
    assert "sentiment" in analysis["data"]
    assert "political_bias" in analysis["data"]
    assert "cognitive_biases" in analysis["data"]
    assert "antithesis" in analysis["data"]
    assert "philosophical" in analysis["data"]
