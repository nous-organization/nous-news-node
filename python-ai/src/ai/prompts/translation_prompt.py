"""
translation_prompt.py

Strict JSON-only translation prompt for instruction-tuned LLMs.

Used ONLY as a fallback when MT models fail.
"""

def get_translation_prompt(text: str, target_language: str) -> str:
    return (
        "[INST]\n"
        "You are a professional news translation system.\n\n"
        "Translate the provided text into the target language.\n"
        "The translation must be literal, faithful, and preserve:\n"
        "- Names\n"
        "- Numbers\n"
        "- Dates\n"
        "- Proper nouns\n"
        "- Factual meaning\n\n"
        "Return EXACTLY ONE JSON OBJECT:\n\n"
        "{\n"
        '  "translation": string\n'
        "}\n\n"
        "STRICT RULES:\n"
        "- Output MUST be valid JSON.\n"
        "- Output MUST contain ONLY the JSON object.\n"
        "- Do NOT summarize or paraphrase.\n"
        "- Do NOT add explanations.\n"
        "- Preserve sentence boundaries.\n\n"
        f"Target language: {target_language}\n\n"
        "Text:\n"
        f"\"\"\"\n{text}\n\"\"\"\n\n"
        "Return ONLY the JSON object now.\n"
        "[/INST]"
    )
