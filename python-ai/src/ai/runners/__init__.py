# ai/runners/__init__.py
"""
Internal LLM execution utilities for the Nous AI backend.

This package contains low-level runner helpers used to execute
instruction-tuned language models (LLMs) in a safe, repeatable,
and production-ready way.
"""

__version__ = "0.1.0"

# Public runner utilities (internal use)
from .llm_json_runner import run_llm_json

__all__ = [
    "run_llm_json",
]
