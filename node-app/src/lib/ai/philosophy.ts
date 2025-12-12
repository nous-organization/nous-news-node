// src/lib/ai/philosophy.ts
import { getPipeline } from "./models";
import { getTokenizer } from "./tokenizer";

/**
 * Generate a short philosophical or thematic interpretation of an article.
 *
 * Uses a summarization model to create a compressed representation of the
 * article’s emotional or conceptual tone, then reframes it as a
 * philosophical insight.
 *
 * This is an approximation until a dedicated model, rhetorical classifier,
 * or LLM-powered interpretive layer is added.
 *
 * ## Processing Logic
 * 1. Tokenize input using GPT-2 tokenizer.
 * 2. Truncate to 512 tokens.
 * 3. Decode tokens and pass to BART summarizer.
 * 4. Prefix output with `"Philosophical framing: "`.
 *
 * ## Returns
 * A short reflective or thematic interpretation, e.g.:
 * ```ts
 * The narrative reflects a broader tension
 * between technological progress and collective responsibility...
 * ```
 *
 * @param article - Partial article containing optional raw content.
 * @returns A short interpretive/philosophical summary string.
 *
 * @example
 * const insight = await generatePhilosophicalInsight(article);
 * console.log(insight);
 */
export async function generatePhilosophicalInsight(article: {
	content?: string;
}): Promise<string> {
	const { content } = article ?? "";
	if (!content || content.trim().length === 0) {
		console.warn("Tokenizer skipped: empty input");
		return "";
	}

	const TOKEN_LIMIT = 512;

	const tokenizer = await getTokenizer();
	const tokens = tokenizer.encode(content);
	if (tokens.length === 0) {
		console.warn("Tokenizer produced empty token array. Using fallback.");
		return "";
	}

	const truncatedTokens = tokens.slice(0, TOKEN_LIMIT);
	if (!truncatedTokens.length) {
		console.warn("Tokenizer truncated to zero tokens, skipping summarization.");
		return "";
	}

	const inputText = tokenizer.decode(truncatedTokens);

	const summarizer = await getPipeline("summarization", "distilbart-cnn");
	const result = await summarizer(inputText, { max_length: 80 });

	console.log(
		`Generating philosophical insight for ${tokens.length} tokens (truncated to ${truncatedTokens.length})`,
	);

	return result[0].summary_text;
}
