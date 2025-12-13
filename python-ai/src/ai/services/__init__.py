"""
High-level AI service layer for the Nous Python backend.

This package defines the public, stable AI capabilities exposed
by the Nous system. Each module represents a distinct analytical
or generative service operating over text content.

Services in this package:
- Orchestrate model pipelines and runners
- Enforce input/output contracts
- Return structured AIResponse objects
- Hide model-specific and infrastructure details

This is the PRIMARY API surface for AI functionality.
Downstream consumers should import from this package
rather than calling models or runners directly.
"""

__version__ = "0.1.0"

# Public AI services
from . import analyze_article
from . import antithesis
from . import cognitive_bias
from . import philosophical
from . import political_bias
from . import sentiment
from . import summarization
from . import translate
# from . import topic_coverage  # optional / experimental

__all__ = [
    "analyze_article",
    "antithesis",
    "cognitive_bias",
    "philosophical",
    "political_bias",
    "sentiment",
    "summarization",
    "translate",
]
