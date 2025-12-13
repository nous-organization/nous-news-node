"""
LLM JSON Runner

Runs instruction-tuned LLMs and guarantees STRICT JSON output.

Responsibilities:
- Prompt hashing + cache
- LLM invocation
- Robust JSON extraction
- Optional schema validation
"""

from typing import Dict, Any, Callable, Optional
import json
import hashlib
import logging
import re
import threading

from ..models import get_pipeline

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------
# JSON extraction
# ---------------------------------------------------------------------
_JSON_OBJECT_RE = re.compile(r"\{[\s\S]*?\}", re.DOTALL)

# ---------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------
_LLM_JSON_CACHE: Dict[str, Dict[str, Any]] = {}
_cache_lock = threading.Lock()


def run_llm_json(
    *,
    model: str,
    prompt: str,
    max_new_tokens: int = 256,
    temperature: float = 0.0,
    do_sample: bool = False,
    schema_validator: Optional[Callable[[Dict[str, Any]], None]] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Execute an instruction-tuned LLM and return a STRICT JSON object.

    Guarantees:
    - Exactly one JSON object is returned
    - Raises on invalid / missing JSON
    - Optional schema validation
    - Cached by prompt hash
    """

    prompt_hash = hashlib.sha256(prompt.encode("utf-8")).hexdigest()

    with _cache_lock:
        if prompt_hash in _LLM_JSON_CACHE:
            logger.debug("[llm_json_runner] Cache hit")
            return _LLM_JSON_CACHE[prompt_hash]

    bundle = get_pipeline("text-generation", model)

    if "generate" not in bundle:
        raise RuntimeError(f"Model '{model}' does not support text generation")

    raw_output = bundle["generate"](
        prompt,
        max_new_tokens=max_new_tokens,
        temperature=temperature,
        do_sample=do_sample,
    )

    if not raw_output or not raw_output.strip():
        logger.error("LLM returned empty output")
        raise ValueError("LLM returned empty output")

    # Check if raw output starts and ends with curly braces
    if raw_output.startswith("{") and raw_output.endswith("}"):
        match = raw_output
    else:
        logger.error(f"Unexpected LLM output format: {raw_output}")
        raise ValueError("Unexpected LLM output format")

    try:
        parsed = json.loads(match)
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON returned by LLM: {e}")
        raise ValueError(f"Invalid JSON returned by LLM: {e}")

    if not isinstance(parsed, dict):
        logger.error("LLM JSON output is not an object")
        raise ValueError("LLM JSON output is not an object")

    if schema_validator:
        schema_validator(parsed)

    with _cache_lock:
        _LLM_JSON_CACHE[prompt_hash] = parsed

    return parsed
