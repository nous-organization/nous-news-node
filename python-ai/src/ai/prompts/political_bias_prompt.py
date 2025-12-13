"""
political_bias_prompt.py

Build a strict, JSON-only prompt for political bias classification.

Optimized for instruction-tuned but imperfect models such as:
- mistral-7b-instruct
- llama-3-instruct (free / open weights)

The model MUST output exactly one JSON object and nothing else.
"""

def get_political_bias_prompt(text: str) -> str:
    """
    Construct a strict prompt that forces JSON-only output.

    Expected output shape:
    {
      "bias": "left" | "center" | "right"
    }

    Rules enforced in-prompt:
    - Valid JSON only
    - No explanations
    - Lowercase labels only
    - Exactly one object
    """

    text = text.strip()

    return (
        "[INST]\n"
        "You are a political bias classification system.\n\n"
        "Your task is to analyze the text provided and determine its overall "
        "political bias.\n\n"
        "You MUST return EXACTLY ONE JSON OBJECT with the following structure:\n\n"
        "{\n"
        '  "bias": "left" | "center" | "right"\n'
        "}\n\n"
        "STRICT RULES:\n"
        "- Output MUST be valid JSON.\n"
        "- Output MUST contain exactly one JSON object and nothing else.\n"
        "- Do NOT include explanations, comments, markdown, or extra text.\n"
        "- The value of \"bias\" MUST be lowercase.\n"
        "- Allowed values are ONLY: \"left\", \"center\", \"right\".\n"
        "- If the bias is unclear or mixed, choose the most likely label.\n\n"
        "Text to analyze:\n"
        f"\"\"\"\n{text}\n\"\"\"\n\n"
        "Return ONLY the JSON object now.\n"
        "[/INST]"
    )
