/**
 * Build a strict JSON-only prompt for extracting tags, topics, or named entities.
 *
 * This prompt is designed for weak or constrained LLMs (e.g., GPT-2, LLaMA mini)
 * to produce predictable, structured output that can be parsed automatically.
 *
 * The model must output EXACTLY a JSON array of strings representing:
 * - important topics
 * - named entities (people, places, organizations)
 * - relevant keywords/tags
 *
 * Requirements:
 * - Output must be valid JSON.
 * - No extra commentary, sentences, or formatting outside the array.
 * - Array items should be concise and normalized (title-case or lowercase is fine).
 *
 * @param {string} text - The text to analyze.
 *   Recommended to pass a trimmed portion (1–2k characters) to reduce token load.
 *
 * @returns {string} A prompt string ready to feed into a text-generation model.
 *
 * @example
 * const prompt = getTagsPrompt("The farmer harvested organic carrots from his greenhouse in Jeju, using sustainable irrigation methods.");
 * // Expected model output:
 * // ["Farmer", "Organic Carrots", "Greenhouse", "Jeju", "Sustainable Irrigation"]
 */
export function getTagsPrompt(text: string): string {
	return `
You are a topic and named-entity extractor.

Analyze the text below and return ONLY a JSON array of strings
representing the main topics, tags, and named entities.

Rules:
- Output MUST be valid JSON.
- Output MUST contain ONLY the JSON array.
- No sentences, commentary, or markdown outside the array.

Text to analyze:
"""${text}"""

Return ONLY the JSON array now:
`;
}
