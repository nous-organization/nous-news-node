"""
antithesis_prompt.py

Build a strict prompt for antithesis generation using an LLM.

This prompt forces the model to return ONLY a concise counter-argument
to the main thrust of the provided text.

Designed for:
- mistral-7b-instruct
- llama-3-instruct
- weaker local instruction-tuned LLMs
"""

from textwrap import dedent


def get_antithesis_prompt(text: str) -> str:
    """
    Build a strict instruction prompt for antithesis generation.

    Parameters
    ----------
    text : str
        The source text. The caller should truncate
        long inputs to stay within token limits.

    Returns
    -------
    str
        A complete instruction prompt suitable for LLM generation.
    """
    text = text.strip()

    return dedent(
        f"""
        You are an expert critical thinker and philosopher.

        Your task is to generate the strongest possible
        opposing viewpoint to the main argument or narrative
        presented in the text below.

        Rules:
        - Focus on substance, not tone.
        - Do NOT summarize the original text.
        - Do NOT agree with the text.
        - Present the most charitable, intellectually serious counter-position.
        - Be concise, neutral, and analytical.
        - Do NOT include meta-commentary or explanations of what you are doing.

        Respond with ONLY the antithesis text.
        No markdown. No labels. No JSON.

        Text:
        \"\"\"{text}\"\"\"

        Antithesis:
        """
    ).strip()
