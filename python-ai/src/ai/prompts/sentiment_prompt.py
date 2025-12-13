"""
sentiment_prompt.py

Build a strict JSON-only prompt for sentiment analysis.

Optimized for:
- mistral-7b-instruct
- llama-3-instruct
- weak local text-generation models

The model MUST output exactly one JSON object and nothing else.
"""

def get_sentiment_prompt(text: str) -> str:
    """
    Construct a strict sentiment analysis prompt.

    Expected output shape:

    {
      "sentiment": "positive" | "negative" | "neutral",
      "confidence": number,   // float between 0 and 1
      "explanation": string  // short 1–2 sentence justification
    }
    """

    text = text.strip()

    return (
        "[INST]\n"
        "You are a sentiment analysis system.\n\n"
        "Analyze the provided text and return EXACTLY ONE JSON OBJECT with "
        "the following structure:\n\n"
        "{\n"
        '  "sentiment": "positive" | "negative" | "neutral",\n'
        '  "confidence": number,\n'
        '  "explanation": string\n'
        "}\n\n"
        "FIELD DEFINITIONS:\n"
        "- \"sentiment\": overall emotional polarity of the text.\n"
        "- \"confidence\": a number from 0.0 to 1.0 indicating certainty.\n"
        "- \"explanation\": brief reasoning in 1–2 sentences.\n\n"
        "STRICT RULES:\n"
        "- Output MUST be valid JSON.\n"
        "- Output MUST be exactly one JSON object and nothing else.\n"
        "- Do NOT include markdown, comments, or extra text.\n"
        "- Do NOT include quotes or commentary outside the JSON object.\n"
        "- The confidence value MUST be between 0 and 1.\n"
        "- If sentiment is mixed or unclear, choose \"neutral\".\n\n"
        "Text to analyze:\n"
        f"\"\"\"\n{text}\n\"\"\"\n\n"
        "Return ONLY the JSON object now.\n"
        "[/INST]"
    )

def get_sentiment_prompt_strict(text: str) -> str:
    return (
        "[INST]\n"
        "Output contract:\n"
        "The response MUST be a single valid JSON object.\n"
        "Any text before or after the JSON object is invalid.\n\n"
        "Valid response example:\n"
        "{\n"
        '  "sentiment": "positive",\n'
        '  "confidence": 0.93,\n'
        '  "explanation": "the language expresses clear approval and enthusiasm."\n'
        "}\n\n"
        "Analyze the following text and respond ONLY with a JSON object:\n\n"
        f"{text}\n\n"
        "[/INST]"
    )
