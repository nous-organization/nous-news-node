"""
cognitive_bias_prompt.py

Build a strict prompt for cognitive bias detection using an LLM.

This prompt forces the model to return ONLY a JSON array describing
any detected cognitive biases in a text sample.

Expected output schema for each item:

{
  "bias": string,             // Name of the detected cognitive bias
  "snippet": string,          // Exact substring from the text
  "explanation": string,      // Human-friendly explanation
  "severity": "low"|"medium"|"high",
  "category": string          // e.g. "Framing", "Emotional Appeal"
}

If no cognitive biases are found, the model MUST return an empty array: [].

Designed for:
- mistral-7b-instruct
- llama-3-instruct
- weaker local LLMs with instruction-following
"""

from textwrap import dedent


def get_cognitive_bias_prompt(text: str) -> str:
    """
    Build a strict instruction prompt for cognitive bias detection.

    Parameters
    ----------
    text : str
        The text to analyze. The caller should truncate
        long inputs to stay within token limits.

    Returns
    -------
    str
        A complete instruction prompt suitable for LLM generation.
    """
    text = text.strip()

    return dedent(
        f"""
        You are an expert cognitive-bias classifier.

        Analyze the text below for cognitive biases, logical fallacies,
        emotional manipulation, or subtle framing effects.

        Respond ONLY with a valid JSON array.
        Do NOT include commentary, markdown, or text outside JSON.

        Each item in the array MUST have the following structure:
        {{
          "bias": string,
          "snippet": string,
          "explanation": string,
          "severity": "low" | "medium" | "high",
          "category": string
        }}

        Rules:
        - "snippet" MUST be an exact substring from the text.
        - Use clear, commonly recognized bias names.
        - Severity reflects how strongly the bias is expressed.
        - Category examples: "Framing", "Emotional Appeal", "Causal Fallacy".

        If NO cognitive biases are found, respond with:
        []

        Text to analyze:
        \"\"\"{text}\"\"\"

        Return ONLY the JSON array:
        """
    ).strip()
