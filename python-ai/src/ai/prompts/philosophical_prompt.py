"""
philosophical_prompt.py

Build a strict JSON-only prompt for philosophical or thematic analysis.

Optimized for:
- mistral-7b-instruct
- llama-3-instruct
- other open-weight instruction-tuned models

The model MUST output exactly one JSON object and nothing else.
"""

def get_philosophical_prompt(text: str) -> str:
    """
    Construct a strict philosophical analysis prompt.

    Expected output shape:

    {
      "philosophical": string,
      "themes": string[],
      "worldview": string,
      "ethical_questions": string[],
      "traditions": string[],
      "explanation": string
    }
    """

    text = text.strip()

    return (
        "[INST]\n"
        "You are a philosophical analysis system.\n\n"
        "Analyze the provided text through a philosophical lens and "
        "produce EXACTLY ONE JSON OBJECT with the following structure:\n\n"
        "{\n"
        '  "philosophical": string,\n'
        '  "themes": string[],\n'
        '  "worldview": string,\n'
        '  "ethical_questions": string[],\n'
        '  "traditions": string[],\n'
        '  "explanation": string\n'
        "}\n\n"
        "FIELD DEFINITIONS:\n"
        "- \"philosophical\": a high-level philosophical interpretation of the text.\n"
        "- \"themes\": core recurring ideas (e.g., power, identity, meaning, suffering).\n"
        "- \"worldview\": the implicit view of reality, society, or human nature.\n"
        "- \"ethical_questions\": moral dilemmas or value judgments implied by the text.\n"
        "- \"traditions\": philosophical schools or movements related to the text.\n"
        "- \"explanation\": brief reasoning in 1–3 sentences.\n\n"
        "STRICT RULES:\n"
        "- Output MUST be valid JSON.\n"
        "- Output MUST be exactly one JSON object and nothing else.\n"
        "- Do NOT include explanations outside the JSON object.\n"
        "- Do NOT include markdown, comments, or extra text.\n"
        "- Use natural language values, but keep output concise and precise.\n"
        "- If uncertain, make the most reasonable philosophical inference.\n\n"
        "Text to analyze:\n"
        f"\"\"\"\n{text}\n\"\"\"\n\n"
        "Return ONLY the JSON object now.\n"
        "[/INST]"
    )
