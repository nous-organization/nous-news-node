"""
philosophical.py 

Generate a structured philosophical or thematic interpretation of an article.

Uses:
- Instruction-tuned LLM (Mistral-7B-Instruct)
- Strict JSON-only philosophical prompt
"""

from typing import Optional

from ..types import AIResponse
from ..prompts.philosophical_prompt import get_philosophical_prompt
from ..runners.llm_json_runner import run_llm_json

# ---------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------
MODEL_KEY = "mistral-7b-instruct"

MAX_INPUT_TOKENS = 512
MAX_PROMPT_TOKENS = 384
MAX_NEW_TOKENS = 256


# ---------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------
def generate_philosophical_insight(content: Optional[str]) -> AIResponse:
    """
    Generate a philosophical or thematic interpretation of article content
    using an instruction-tuned LLM.

    Returns
    -------
    AIResponse
        status: "ok" | "partial" | "error"
        data: structured philosophical analysis (JSON)
        errors: optional list of errors
        meta: model + analysis metadata
    """
    if not content or not content.strip():
        return AIResponse(
            status="error",
            data={},
            errors=["Empty input provided"],
            meta=None,
        )

    prompt = get_philosophical_prompt(content.strip())

    return run_llm_json(
        prompt=prompt,
        model=MODEL_KEY,
        max_input_tokens=MAX_INPUT_TOKENS,
        max_prompt_tokens=MAX_PROMPT_TOKENS,
        max_new_tokens=MAX_NEW_TOKENS,
        temperature=0.3,
        do_sample=False,
        meta={
            "analysis_model": MODEL_KEY,
            "analysis_type": "philosophical",
        },
    )
