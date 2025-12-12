// src/lib/ai/antithesis.ts
import { getPipeline } from "./models";
import { getTokenizer } from "./tokenizer";

/**
 * Generate an "antithesis" summary for an article — a concise synthesis of
 * the opposing viewpoint or counter-narrative to the article’s main thrust.
 *
 * This function uses a local summarization model via Transformers.js:
 *   - Task: `"summarization"`
 *   - Model Key: `"distilbart-cnn"`
 *
 * ## Processing Logic
 * 1. Tokenize input using GPT-2 tokenizer.
 * 2. Truncate to 512 tokens to prevent model overflow.
 * 3. Decode tokens and pass to BART summarizer.
 * 4. Prepend the summary with `"Opposing viewpoint: "`.
 *
 * ## Returns
 * A short string suggesting a counterpoint to the main article content.
 *
 * @param article - Object containing optional raw article text.
 * @returns A reframed summarization suggesting an opposing viewpoint.
 *
 * @example
 * const antithesis = await generateAntithesis(article);
 * console.log(antithesis);
 * // "While the article emphasizes..."
 */
export async function generateAntithesis(article: {
	content?: string;
}): Promise<string> {
	const { content } = article ?? "";
	if (!content || content.trim().length === 0) {
		console.warn("Tokenizer skipped: empty input");
		return "";
	}

	const tokenizer = await getTokenizer();
	const tokens = tokenizer.encode(content);
	if (tokens.length === 0) {
		console.warn("Tokenizer produced empty token array. Using fallback.");
		return "";
	}
	const truncatedTokens = tokens.slice(0, 512);
	const inputText = tokenizer.decode(truncatedTokens);

	const summarizer = await getPipeline("summarization", "distilbart-cnn");
	const result = await summarizer(inputText, { max_length: 120 });

	console.log(
		`Generating antithesis for ${tokens.length} tokens (truncated to ${truncatedTokens.length})`,
	);

	return result[0].summary_text;
}
