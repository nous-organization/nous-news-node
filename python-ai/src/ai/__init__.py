"""
AI package for Nous Python backend.

Provides high-level AI services for article analysis, sentiment,
bias detection, philosophical interpretation, summarization,
translation, tagging, and topic coverage.

This module exposes:
- A stable, public AI service API via `ai.services`
- Explicit access to low-level utilities when needed

Most consumers SHOULD import from `ai.services` rather than
calling models or runners directly.
"""

__version__ = "0.1.0"

# ---------------------------------------------------------------------
# Public service API (preferred imports)
# ---------------------------------------------------------------------
from .services import (
    analyze_article,
    antithesis,
    cognitive_bias,
    philosophical,
    political_bias,
    sentiment,
    summarization,
    translate,
    extract_tags,
    topic_coverage,
)

# ---------------------------------------------------------------------
# Low-level utilities (explicit / advanced use only)
# ---------------------------------------------------------------------
from . import types

__all__ = [
    # Services
    "analyze_article",
    "antithesis",
    "cognitive_bias",
    "philosophical",
    "political_bias",
    "sentiment",
    "summarization",
    "translate",
    "extract_tags",
    "topic_coverage",
    # Utilities
    "types",
]
