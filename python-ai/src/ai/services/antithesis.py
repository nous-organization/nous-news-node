"""
antithesis.py

Generate an 'antithesis' summary for an article — a concise synthesis of
the strongest opposing viewpoint or counter-narrative to the article’s
main thrust.

Designed for:
- mistral-7b-instruct
- llama-3-instruct
"""

from typing import Optional
import logging

from ..types import AIResponse
from ..models import get_pipeline
from ..prompts.antithesis_prompt import get_antithesis_prompt

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ---------------------------------------------------------------------
# Limits
# ---------------------------------------------------------------------
MAX_PROMPT_TOKENS = 384
MAX_NEW_TOKENS = 160

# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------
def generate_antithesis(content: Optional[str]) -> AIResponse:
    """
    Generate an antithesis (counter-argument) for a given text.

    Parameters
    ----------
    content : Optional[str]
        Input article or passage.

    Returns
    -------
    AIResponse
        status: "ok" | "error"
        data: {"antithesis": str}
        meta: token usage
    """
    if not content or not content.strip():
        return AIResponse(
            status="error",
            data={"antithesis": ""},
            errors=["Empty input provided"],
            meta=None,
        )

    errors = []
    meta = {}
    antithesis_text = ""

    try:
        # ---------------------------------------------------
        # Load Mistral instruction model
        # ---------------------------------------------------
        llm_bundle = get_pipeline("text-generation", "mistral-7b-instruct")

        llm_generate = llm_bundle["generate"]
        llm_tokenizer = llm_bundle["tokenizer"]

        # ---------------------------------------------------
        # Tokenize + truncate input
        # ---------------------------------------------------
        tokens = llm_tokenizer.encode(
            content,
            truncation=True,
            max_length=MAX_PROMPT_TOKENS,
        )
        meta["input_tokens"] = len(tokens)

        truncated_text = llm_tokenizer.decode(
            tokens,
            skip_special_tokens=True,
        )

        # ---------------------------------------------------
        # Build strict antithesis prompt
        # ---------------------------------------------------
        prompt = get_antithesis_prompt(truncated_text)

        # ---------------------------------------------------
        # Generate antithesis
        # ---------------------------------------------------
        output = llm_generate(
            prompt,
            max_new_tokens=MAX_NEW_TOKENS,
            temperature=0.4,
            do_sample=False,
        )

        if not output or not output.strip():
            raise ValueError("LLM returned empty output")

        antithesis_text = output.strip()
        meta["output_tokens_est"] = len(
            llm_tokenizer.encode(antithesis_text)
        )

    except Exception as e:
        logger.exception("Antithesis generation failed")
        errors.append(str(e))

    return AIResponse(
        status="ok" if not errors else "error",
        data={"antithesis": antithesis_text},
        errors=errors or None,
        meta=meta or None,
    )
