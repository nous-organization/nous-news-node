"""
Article Analysis Orchestrator

This module provides a master analysis function for articles. It sequentially runs multiple
AI-powered sub-analyzers and composes their outputs into a single structured response.

Sub-analyzers include:
- Political bias detection
- Sentiment analysis
- Cognitive bias detection
- Antithesis generation
- Philosophical insight generation

Each sub-analyzer returns an AIResponse, which is merged into the final result.
Errors from individual analyzers are collected and surfaced in the final response.

Usage:
    analyzed_response = analyze_article(article_dict, job_id="optional-job-id")
"""

import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any, List

from .political_bias import detect_political_bias
from .sentiment import analyze_sentiment
from .cognitive_bias import detect_cognitive_bias
from .antithesis import generate_antithesis
from .philosophical import generate_philosophical_insight
from ..types import AIResponse


def run_analyzer(fn, content: str, label: str, parent_errors: List[str]) -> Optional[Dict[str, Any]]:
    """
    Runs a single analysis function on the article content.

    Args:
        fn: Callable that accepts content and returns an AIResponse.
        content: Text content of the article.
        label: Name of the analysis module (used for error tagging).
        parent_errors: List to collect errors from this analyzer.

    Returns:
        The `.data` field of the AIResponse, or None if the analyzer fails.
        Any errors are appended to `parent_errors`.
    """
    try:
        response: AIResponse = fn(content)

        # Collect errors from this analyzer
        if response.get("errors"):
            parent_errors.extend([f"{label}: {err}" for err in response["errors"]])

        # Return structured data payload
        return response.get("data")

    except Exception as e:
        parent_errors.append(f"{label}: internal exception - {e}")
        return None


def analyze_article(article: Dict[str, Any], job_id: Optional[str] = None) -> AIResponse:
    """
    Master article analysis function.

    Orchestrates multiple AI analyzers and returns a unified AIResponse.

    Args:
        article: Dictionary containing article data. Must include a 'content' field.
        job_id: Optional job identifier for tracing in pipelines.

    Returns:
        AIResponse containing:
            - status: "ok" if all sub-analyzers succeeded, otherwise "error"
            - data: Aggregated analysis results including:
                - id: Unique analysis ID
                - original_id: Original article ID if present
                - political_bias, sentiment, cognitive_biases, antithesis, philosophical
                - analysis_timestamp: UTC ISO8601 timestamp
            - errors: List of errors from sub-analyzers, if any
            - meta: Metadata including job_id
    """
    content = article.get("content", "")
    if not content.strip():
        return AIResponse(
            status="error",
            data=None,
            errors=["No content provided"],
            meta={"job_id": job_id},
        )

    errors: List[str] = []

    # Run each sub-analyzer sequentially
    political_bias = run_analyzer(detect_political_bias, content, "political_bias", errors)
    sentiment = run_analyzer(analyze_sentiment, content, "sentiment", errors)
    cognitive_biases = run_analyzer(detect_cognitive_bias, content, "cognitive_biases", errors)
    antithesis = run_analyzer(generate_antithesis, content, "antithesis", errors)
    philosophical = run_analyzer(generate_philosophical_insight, content, "philosophical", errors)

    # Compose final structured output
    analyzed = {
        "id": str(uuid.uuid4()),
        "original_id": article.get("id"),
        **article,
        "political_bias": political_bias,
        "sentiment": sentiment,
        "cognitive_biases": cognitive_biases,
        "antithesis": antithesis,
        "philosophical": philosophical,
        "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
    }

    return AIResponse(
        status="ok" if not errors else "error",
        data=analyzed,
        errors=errors or None,
        meta={"job_id": job_id},
    )
