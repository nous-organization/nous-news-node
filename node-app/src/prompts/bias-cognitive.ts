/**
 * Build a strict prompt for cognitive bias detection using an LLM.
 *
 * This function returns an instruction block that forces the model
 * to output *only* a JSON array describing any detected cognitive biases
 * inside a text sample.
 *
 * The model must produce an array of objects with the following shape:
 * ```
 * {
 *   bias: string,              // Name of the detected cognitive bias
 *   snippet: string,           // Exact substring from the text
 *   explanation: string,       // Human-friendly explanation
 *   severity: "low"|"medium"|"high",
 *   category: string           // Category, e.g. "Framing", "Emotional Appeal"
 * }
 * ```
 *
 * If no cognitive biases are found, the model is instructed to return an empty array: `[]`.
 *
 * This prompt is specifically optimized for weak LLMs such as GPT-2
 * that hallucinate unless tightly constrained. It:
 * - uses fenced triple quotes to isolate user text,
 * - repeats the instruction that the output must be *only* JSON,
 * - forbids commentary before or after the JSON array.
 *
 * @param {string} text - The text to analyze for cognitive biases.
 *   It is recommended to pre-trim long text to stay within token limits
 *   for smaller local models (e.g., first 2000 characters).
 *
 * @returns {string} A complete prompt string that can be fed directly to
 *   a text-generation model for structured cognitive-bias detection.
 *
 * @example
 * const prompt = getCognitiveBiasPrompt("The shocking truth will outrage you!");
 * // → string containing full instructions and JSON-only output requirement
 */
export function getCognitiveBiasPrompt(text: string): string {
	return `
You are an expert cognitive-bias classifier.

Analyze the text below for cognitive biases or subtle framing effects.

Respond ONLY with a valid JSON array. No commentary. No explanation outside JSON.

Each item must contain:
{
  "bias": string,             // name of the cognitive bias
  "snippet": string,          // exact substring showing the bias
  "explanation": string,      // human explanation
  "severity": "low"|"medium"|"high",
  "category": string          // e.g. "Framing", "Emotional Appeal"
}

If no biases are found, return: []

Text to analyze:
"""${text}"""

Return ONLY a JSON array:
`;
}
