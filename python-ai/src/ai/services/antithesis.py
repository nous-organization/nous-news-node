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
def generate_antithesis(content: Optional[str], model_key: str = "mistral-7b-instruct") -> AIResponse:
    """
    Generate an antithesis (counter-argument) for a given text.

    Parameters
    ----------
    content : Optional[str]
        Input article or passage.

    model_key : str
        The key of the model to use for generation. Defaults to "mistral-7b-instruct".

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
        # Load model based on provided key
        # ---------------------------------------------------
        llm_bundle = get_pipeline(
            "text-generation",
            model_key,
        )

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

        # ---------------------------------------------------
        # Validation for too short antithesis
        # ---------------------------------------------------
        if len(antithesis_text.split()) < 5:
            errors.append("Generated antithesis is too short.")
            antithesis_text = ""

    except Exception as e:
        logger.exception("Antithesis generation failed")
        errors.append(str(e))

    return AIResponse(
        status="ok" if not errors else "error",
        data={"antithesis": antithesis_text},
        errors=errors or None,
        meta=meta or None,
    )
