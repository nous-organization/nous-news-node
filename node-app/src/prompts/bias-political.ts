/**
 * Build a strict, JSON-only prompt for political bias classification.
 *
 * This prompt is optimized for weaker or constrained LLMs (e.g., GPT-2,
 * local text-generation models) that may hallucinate or add extra text
 * unless explicitly constrained. The model is instructed to output
 * exactly one JSON object with the shape:
 *
 * {
 *   "bias": "left" | "center" | "right"
 * }
 *
 * - Output MUST be valid JSON.
 * - No commentary, no explanation, no extra text before or after JSON.
 * - "bias" must be lowercase.
 * - If uncertain, pick the best label among the three.
 *
 * @param {string} text - Article text to analyze. Trim to ~1–2k chars
 *                        for small models to avoid token limits.
 * @returns {string} A prompt string that forces JSON-only output.
 *
 * @example
 * const prompt = getPoliticalBiasPrompt(article.content);
 * // Expected model output:
 * // { "bias": "left" }
 */
export function getPoliticalBiasPrompt(text: string): string {
	return `
You are a political-bias classifier.

Analyze the news article text below and output EXACTLY ONE JSON OBJECT
(with no additional text, punctuation, or commentary) having the shape:

{
  "bias": "left" | "center" | "right"
}

Rules:
- Output MUST be valid JSON.
- Output MUST be exactly one JSON object and nothing else.
- The "bias" value must be lowercase and must be one of: "left", "center", or "right".
- Do NOT include explanations, quotes, or extra characters.
- If uncertain, choose the most likely label.

Text to analyze:
"""${text}"""

Return ONLY the JSON object now:
`;
}
