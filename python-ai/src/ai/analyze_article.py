import uuid
from datetime import datetime, timezone
from typing import Optional, Dict, Any

from .political_bias import detect_political_bias
from .sentiment import analyze_sentiment
from .cognitive_bias import detect_cognitive_bias
from .antithesis import generate_antithesis
from .philosophy import generate_philosophical_insight
from .types import AIResponse


def run_analyzer(fn, content, label, parent_errors: list):
    """
    Runs an analysis module expected to return AIResponse.

    - Collects and merges child errors
    - Unwraps the .data payload for composition
    """
    try:
        response: AIResponse = fn(content)

        # Merge child errors
        if response.get("errors"):
            parent_errors.extend([f"{label}: {err}" for err in response["errors"]])

        # Always return .data
        return response.get("data")

    except Exception as e:
        parent_errors.append(f"{label}: internal exception - {e}")
        return None


def analyze_article(article: Dict[str, Any], job_id: Optional[str] = None) -> AIResponse:
    """
    Master analyzer that orchestrates all sub-analyzers.
    Produces a unified AIResponse payload.
    """

    content = article.get("content", "")
    if not content.strip():
        return AIResponse(
            status="error",
            data=None,
            errors=["No content provided"],
            meta={"job_id": job_id},
        )

    errors: list[str] = []

    # Sequential analysis
    political_bias = run_analyzer(detect_political_bias, content, "political_bias", errors)
    sentiment = run_analyzer(analyze_sentiment, content, "sentiment", errors)
    cognitive_biases = run_analyzer(detect_cognitive_bias, content, "cognitive_biases", errors)
    antithesis = run_analyzer(generate_antithesis, content, "antithesis", errors)
    philosophical = run_analyzer(generate_philosophical_insight, content, "philosophical", errors)

    # Final structured output
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
