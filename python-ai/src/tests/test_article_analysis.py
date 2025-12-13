import pytest
from src.ai.services import analyze_article
from src.ai.types import AIResponse

# ------------------------------
# Basic pipeline test
# ------------------------------
def test_analyze_article_pipeline_basic():
    """
    Test the full article analysis pipeline with a typical article.
    Ensures all AI services are invoked and return expected keys.
    """
    article = {
        "content": "The company announced a new product that will revolutionize AI."
    }
    result = analyze_article.analyze_article(article)

    assert isinstance(result, AIResponse), "Result must be an AIResponse instance."
    assert result.status in {"ok", "partial"}, f"Unexpected status: {result.status}"

    data = result.data
    # Check all expected outputs
    for key in ["sentiment", "political_bias", "cognitive_biases", "antithesis", "philosophical"]:
        assert key in data, f"{key} missing from result.data"

# ------------------------------
# Empty content
# ------------------------------
def test_analyze_article_pipeline_empty_content():
    """
    An empty article should not break the pipeline.
    Should return partial or error status.
    """
    article = {"content": ""}
    result = analyze_article.analyze_article(article)

    assert isinstance(result, AIResponse)
    assert result.status in {"partial", "error"}

# ------------------------------
# Large content
# ------------------------------
def test_analyze_article_pipeline_large_content():
    """
    Test with a very long article to ensure pipeline handles large input gracefully.
    """
    article = {"content": "Sentence. " * 5000}  # simulate large article
    result = analyze_article.analyze_article(article)

    assert isinstance(result, AIResponse)
    assert result.status in {"ok", "partial"}

    data = result.data
    for key in ["sentiment", "political_bias", "cognitive_biases", "antithesis", "philosophical"]:
        assert key in data
