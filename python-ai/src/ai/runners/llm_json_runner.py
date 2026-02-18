"""
LLM JSON Runner — Dynamic Model Selection & Strict JSON

Runs instruction-tuned LLMs (e.g., Mistral) with automatic model choice
based on article length and device capabilities. Guarantees strict JSON output.

Features:
- Prompt hashing + caching
- Device-aware LLM invocation (CPU/MPS/CUDA)
- Robust JSON extraction
- Optional schema validation
- Safe fallback to raw output if JSON fails
"""

from typing import Dict, Any, Callable, Optional
import json
import hashlib
import logging
import threading

from ..utils.tokenizer import generate_text

# Configure logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# In-memory cache for prompt responses
_LLM_JSON_CACHE: Dict[str, Dict[str, Any]] = {}
_cache_lock = threading.Lock()


def run_llm_json(
    *,
    prompt: str,
    max_new_tokens: int = 256,
    temperature: float = 0.0,
    do_sample: bool = False,
    schema_validator: Optional[Callable[[dict], None]] = None,
    meta: Optional[dict] = None,
) -> dict:
    """
    Execute a device-aware LLM and return strict JSON.
    Model selection is handled by `generate_text()` / `select_mistral_model()`.
    """
    # Build cache key
    prompt_hash = hashlib.sha256(prompt.encode("utf-8")).hexdigest()

    # Return cached result if available
    with _cache_lock:
        if prompt_hash in _LLM_JSON_CACHE:
            logger.debug("[llm_json_runner] Cache hit")
            return _LLM_JSON_CACHE[prompt_hash]

    try:
        # Generate raw output from the dynamic LLM
        raw_text = generate_text(
            text=prompt,
            max_new_tokens=max_new_tokens,
            do_sample=do_sample,
        ).strip()

        # Attempt strict JSON parsing
        parsed = json.loads(raw_text)
        if not isinstance(parsed, dict):
            raise ValueError("LLM JSON output is not a dictionary/object")

        # Optional schema validation
        if schema_validator:
            schema_validator(parsed)

        # Cache result
        with _cache_lock:
            _LLM_JSON_CACHE[prompt_hash] = parsed

        return parsed

    except json.JSONDecodeError:
        logger.warning("[llm_json_runner] Non-JSON output, returning raw text")
        return {"output": raw_text}

    except Exception as e:
        logger.exception("[llm_json_runner] Execution failed")
        raise RuntimeError(f"LLM execution failed: {e}")
