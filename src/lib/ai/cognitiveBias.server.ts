import { getCognitiveBiasPrompt } from "@/prompts/bias-cognitive";
import type { CognitiveBias } from "@/types/article-analyzed";
import { getPipeline } from "./models.server";
import { getTokenizer } from "./tokenizer.server";

const MAX_TOKENS = 1024; // Max tokens supported by distilbert-sst2
const MAX_GPT2_PROMPT_TOKENS = 512; // Safe limit for GPT-2 prompt

/**
 * Detect cognitive biases within an article using a two-stage hybrid pipeline.
 *
 * Stage 1 — Binary Bias Classification (fast)
 *   Uses a sentiment model (distilbert-sst2) to approximate bias:
 *     - POSITIVE → Biased
 *     - NEGATIVE / NEUTRAL → Neutral
 *
 * Stage 2 — Cognitive Bias Breakdown (optional, slower)
 *   If Stage 1 detects bias **and** useTextGen=true, GPT-2 produces structured JSON.
 *
 * Token-based truncation is applied to prevent memory or index errors.
 *
 * @param article - Object containing optional `content` string
 * @param options - Optional settings
 *   @property useTextGen - If true, perform full GPT-2 cognitive bias breakdown (default: true)
 * @returns Array of detected cognitive biases
 *
 * @example
 * const biases = await detectCognitiveBias({ content: "The government announced..." });
 * console.log(biases); // e.g., [{ bias: "Appeal to Authority", snippet: "..." }, ...]
 */
export async function detectCognitiveBias(
	article: { content?: string },
	options: { useTextGen?: boolean } = {},
): Promise<CognitiveBias[]> {
	const { useTextGen = true } = options;
	const { content } = article ?? "";
	if (!content || content.trim().length === 0) {
		console.warn("Tokenizer skipped: empty input");
		return [];
	}

	// ---------------------------------------------------------
	// Tokenize text and truncate for safe model input
	// ---------------------------------------------------------
	const tokenizer = await getTokenizer();
	const allTokens = tokenizer.encode(content);

	const truncatedTokens = allTokens.slice(0, MAX_TOKENS);
	const truncatedText = tokenizer.decode(truncatedTokens);

	const results: CognitiveBias[] = [];

	// ---------------------------------------------------------
	// 1. Binary bias detection using distilbert-sst2
	// ---------------------------------------------------------
	try {
		const classifier = await getPipeline("text-classification", "distilbert-sst2");
		const classification = await classifier(truncatedText);

		const rawLabel = classification?.[0]?.label ?? "NEGATIVE";
		const label = rawLabel.toUpperCase();

		// Map POSITIVE → biased, NEGATIVE / NEUTRAL → neutral
		const isBiased = label === "POSITIVE";

		// If no bias detected and useTextGen is false, exit early
		if (!isBiased && !useTextGen) return results;
	} catch (err) {
		console.warn("Binary bias classifier failed:", (err as Error).message);
		if (!useTextGen) return results;
	}

	// ---------------------------------------------------------
	// 2. Full cognitive-bias breakdown using GPT-2
	// ---------------------------------------------------------
	if (useTextGen) {
		try {
			const generator = await getPipeline("text-generation", "gpt2");

			// Truncate tokens for GPT-2 prompt
			const gpt2Tokens = allTokens.slice(0, MAX_GPT2_PROMPT_TOKENS);
			const promptText = tokenizer.decode(gpt2Tokens);

			const prompt = getCognitiveBiasPrompt(promptText);

			const output = await generator(prompt, { max_new_tokens: 400 });

			if (!output?.[0]?.generated_text) {
				console.warn("GPT-2 returned empty output.");
				return results;
			}

			// Remove prompt echo
			const raw = output[0].generated_text;
			const generated = raw.replace(prompt, "");

			// Extract JSON array from generated text
			const match = generated.match(/\[[\s\S]*?\]/);
			if (match) {
				try {
					const parsed = JSON.parse(match[0]);
					return parsed;
				} catch (jsonErr) {
					console.warn("Failed to parse GPT-2 JSON:", (jsonErr as Error).message);
				}
			} else {
				console.warn("GPT-2 returned no valid JSON array.");
			}
		} catch (err) {
			console.warn("GPT-2 cognitive bias detection failed:", (err as Error).message);
		}
	}

	return results;
}
