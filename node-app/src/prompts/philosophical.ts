/**
 * Build a strict JSON-only prompt for philosophical or thematic analysis.
 *
 * This prompt forces the model to analyze a piece of text through a
 * philosophical lens — extracting themes, moral/ethical questions,
 * worldview assumptions, and classification into recognizable
 * philosophical traditions (e.g., existentialism, stoicism,
 * materialism, structuralism).
 *
 * The model must return EXACTLY ONE JSON object with the shape:
 *
 * {
 *   "philosophical": string,         // high-level philosophical interpretation
 *   "themes": string[],              // core themes (e.g. power, identity, meaning, suffering)
 *   "worldview": string,             // implicit worldview expressed in the text
 *   "ethical_questions": string[],   // any moral dilemmas or value judgments implied
 *   "traditions": string[],          // related philosophical schools (e.g., existentialist, taoist)
 *   "explanation": string            // short reasoning in 1–3 sentences
 * }
 *
 * Output must be VALID JSON and contain NO commentary outside the object.
 *
 * @param {string} text - The text to interpret. Recommended to trim to
 *                        ~1–2k characters for weak text-gen models.
 *
 * @returns {string} A strict prompt suitable for local LLMs.
 *
 * @example
 * const prompt = getPhilosophicalPrompt(article.content);
 * // Expected model output:
 * // {
 * //   "philosophical": "A reflection on alienation within modernity.",
 * //   "themes": ["alienation", "technology", "meaning"],
 * //   "worldview": "Existential-humanist with a critique of industrial rationalism.",
 * //   "ethical_questions": ["What do we owe each other?", "Does progress dehumanize?"],
 * //   "traditions": ["existentialism", "critical theory"],
 * //   "explanation": "The text critiques mechanized life and explores human meaning."
 * // }
 */
export function getPhilosophicalPrompt(text: string): string {
	return `
You are a philosophical analyst.

Analyze the text below and produce EXACTLY ONE JSON OBJECT containing:
{
  "philosophical": string,         // main philosophical interpretation
  "themes": string[],              // major themes (identity, power, morality, suffering, etc.)
  "worldview": string,             // implicit worldview expressed by the text
  "ethical_questions": string[],   // moral dilemmas or value assumptions
  "traditions": string[],          // related philosophical schools (e.g., stoicism, existentialism)
  "explanation": string            // 1–3 sentence reasoning
}

Rules:
- Output MUST be valid JSON.
- Output MUST contain ONLY the JSON object, with no surrounding text.
- Use lowercase where reasonable, but natural language values are allowed.
- If uncertain, make the best philosophical inference.

Text to analyze:
"""${text}"""

Return ONLY the JSON object now:
`;
}
