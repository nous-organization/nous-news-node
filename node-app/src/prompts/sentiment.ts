/**
 * Build a strict JSON-only prompt for sentiment analysis.
 *
 * This prompt forces the model — including weak local LLMs (GPT-2, LLaMA
 * mini, etc.) — to classify the sentiment of a text sample while
 * returning a predictable JSON structure that is safe for backend
 * parsing.
 *
 * The model must output EXACTLY ONE JSON object with the shape:
 *
 * {
 *   "sentiment": "positive" | "negative" | "neutral",
 *   "confidence": number,       // float 0–1 representing certainty
 *   "explanation": string       // short reason (optional but helpful)
 * }
 *
 * Requirements:
 * - Output must be valid JSON.
 * - No commentary outside the JSON.
 * - No extra sentences or markdown formatting.
 * - Confidence must be a number between 0 and 1.
 *
 * @param {string} text - The text to analyze for sentiment.
 *   Recommended: pass a trimmed version (first 2k chars) to avoid
 *   overwhelming smaller LLMs.
 *
 * @returns {string} A strict prompt that ensures clean structured output.
 *
 * @example
 * const prompt = getSentimentPrompt("I love these results!");
 * // Expected model output:
 * // {
 * //   "sentiment": "positive",
 * //   "confidence": 0.92,
 * //   "explanation": "The tone expresses enthusiasm and approval."
 * // }
 */
export function getSentimentPrompt(text: string): string {
	return `
You are a sentiment-analysis classifier.

Analyze the text below and return EXACTLY ONE JSON OBJECT with:
{
  "sentiment": "positive" | "negative" | "neutral",
  "confidence": number,       // a value from 0 to 1
  "explanation": string       // a short 1–2 sentence reasoning
}

Rules:
- Output MUST be valid JSON.
- Output MUST contain ONLY the JSON object.
- No commentary, no markdown, no explanation outside the JSON.

Text to analyze:
"""${text}"""

Return ONLY the JSON object now:
`;
}
