"""
summarization_prompt.py

Build a strict JSON-only prompt for text summarization.

Optimized for:
- mistral-7b-instruct
- llama-3-instruct
- weak local instruction-tuned models

The model MUST output exactly one JSON object and nothing else.
"""

def get_summarization_prompt(text: str) -> str:
    """
    Construct a strict summarization prompt.

    Expected output shape:

    {
      "summary": string
    }
    """

    text = text.strip()

    return (
        "[INST]\n"
        "You are a text summarization system.\n\n"
        "Summarize the provided text clearly and concisely, "
        "capturing the main ideas without unnecessary detail.\n\n"
        "Return EXACTLY ONE JSON OBJECT with the following structure:\n\n"
        "{\n"
        '  "summary": string\n'
        "}\n\n"
        "STRICT RULES:\n"
        "- Output MUST be valid JSON.\n"
        "- Output MUST be exactly one JSON object and nothing else.\n"
        "- Do NOT include markdown, comments, or extra text.\n"
        "- The summary should be 2–4 sentences unless the text is very short.\n"
        "- Preserve factual meaning; do NOT add new information.\n\n"
        "Text to summarize:\n"
        f"\"\"\"\n{text}\n\"\"\"\n\n"
        "Return ONLY the JSON object now.\n"
        "[/INST]"
    )
