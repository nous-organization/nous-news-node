"""
tags_prompt.py

Build a strict JSON-only prompt for extracting tags, topics,
and named entities from text.

Designed for:
- mistral-7b-instruct
- llama-3-instruct
- weak local text-generation models (GPT-2-class)

The model MUST output exactly one JSON array of strings and nothing else.
"""

def get_tags_prompt(text: str) -> str:
    """
    Construct a strict prompt for tag / topic / entity extraction.

    Expected output format:

    [
      "tag one",
      "tag two",
      "named entity",
      "topic"
    ]

    Rules:
    - Output MUST be valid JSON
    - Output MUST be exactly one JSON array
    - No commentary or text outside the array
    """

    text = text.strip()

    return (
        "[INST]\n"
        "You are a topic, keyword, and named-entity extraction system.\n\n"
        "Analyze the provided text and return EXACTLY ONE JSON ARRAY of strings.\n\n"
        "Each array item should represent:\n"
        "- an important topic\n"
        "- a named entity (person, place, organization)\n"
        "- or a relevant keyword or tag\n\n"
        "NORMALIZATION RULES:\n"
        "- Use concise phrases (1–4 words each).\n"
        "- Avoid duplicates.\n"
        "- Avoid filler words.\n"
        "- Title case or lowercase is acceptable, but be consistent.\n\n"
        "STRICT OUTPUT RULES:\n"
        "- Output MUST be valid JSON.\n"
        "- Output MUST be exactly one JSON array.\n"
        "- Do NOT include explanations, markdown, or commentary.\n"
        "- Do NOT wrap the array in an object.\n"
        "- If no meaningful tags are found, return an empty array: []\n\n"
        "Text to analyze:\n"
        f"\"\"\"\n{text}\n\"\"\"\n\n"
        "Return ONLY the JSON array now.\n"
        "[/INST]"
    )

def get_tags_prompt_strict(text: str) -> str:
    return (
        "[INST]\n"
        "Output contract:\n"
        "The response MUST be a single valid JSON array of strings.\n"
        "Any text before or after the array is invalid.\n\n"
        "Valid example:\n"
        "[\"organic farming\", \"greenhouse\", \"jeju\", \"sustainable irrigation\"]\n\n"
        "Extract tags from the following text and respond ONLY with a JSON array:\n\n"
        f"{text}\n\n"
        "[/INST]"
    )
