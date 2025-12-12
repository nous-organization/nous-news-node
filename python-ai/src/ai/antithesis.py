"""
Generate an 'antithesis' summary for an article — a concise synthesis of
the opposing viewpoint or counter-narrative to the article’s main thrust.
"""

from typing import Optional
from .types import AIResponse
from .models import get_pipeline
from transformers import AutoTokenizer


# Since summarization pipelines require a tokenizer to get lengths, load once.
_SUMMARIZER_TOKENIZER = AutoTokenizer.from_pretrained(
    "sshleifer/distilbart-cnn-6-6",
    local_files_only=False
)


MAX_INPUT_TOKENS = 512
MAX_SUMMARY_TOKENS = 120


def generate_antithesis(content: Optional[str]) -> AIResponse:
    """
    Produce an opposing-viewpoint summary using the shared model loader.
    """

    if not content or not content.strip():
        return AIResponse(
            status="error",
            data={"summary": ""},
            errors=["Empty input provided"],
            meta=None,
        )

    errors = []
    meta = {}
    summary_text = ""

    # ------------------------------
    # Tokenization + truncation
    # ------------------------------
    try:
        tokens = _SUMMARIZER_TOKENIZER.encode(
            content,
            truncation=True,
            max_length=MAX_INPUT_TOKENS,
        )
        meta["input_tokens"] = len(tokens)

        if not tokens:
            return AIResponse(
                status="error",
                data={"summary": ""},
                errors=["Tokenizer produced zero tokens"],
                meta=meta,
            )

        truncated_text = _SUMMARIZER_TOKENIZER.decode(tokens, skip_special_tokens=True)

    except Exception as e:
        return AIResponse(
            status="error",
            data={"summary": ""},
            errors=[f"Tokenization failed: {e}"],
            meta=None,
        )

    # ------------------------------
    # Summarization (GPU/CPU/MPS automatically handled)
    # ------------------------------
    try:
        pipe = get_pipeline("summarization", "distilbart-cnn")

        result = pipe(
            truncated_text,
            max_length=MAX_SUMMARY_TOKENS,
            min_length=30,
            do_sample=False,
        )

        base_summary = result[0]["summary_text"].strip()
        summary_text = f"Opposing viewpoint: {base_summary}"
        meta["summary_length"] = len(summary_text)

    except Exception as e:
        errors.append(f"Summarization failed: {e}")

    return AIResponse(
        status="ok" if not errors else "error",
        data={"summary": summary_text},
        errors=errors or None,
        meta=meta or None,
    )
