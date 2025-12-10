import type { ArticleAnalyzed } from "@/types/article-analyzed";
import { getPipeline } from "./models.server";
import { getTokenizer } from "./tokenizer.server";

/**
 * Perform sentiment analysis on an article using a lightweight,
 * locally runnable text-classification model via Transformers.js.
 *
 * Currently uses:
 *   - Task: `"text-classification"`
 *   - Model Key: `"distilbert-sst2"` (mapped internally to Xenova/distilbert-base-uncased-finetuned-sst-2-english)
 *
 * The SST-2 model outputs high-level sentiment classes:
 *   - `"positive"`
 *   - `"negative"`
 *   - `"neutral"` (if the model supports it or inferred fallback)
 *
 * ## Processing Details
 * 1. The article's first 128 tokens are analyzed for speed and consistency.
 * 2. If no content is provided → returns `"neutral"`.
 * 3. Results are normalized to lowercase.
 *
 * ## Returned Value
 * Returns a sentiment string compatible with:
 *   `ArticleAnalyzed["sentiment"]`
 *
 * Example output:
 * ```ts
 * "positive" | "negative" | "neutral"
 * ```
 *
 * ## Example
 * ```ts
 * const sentiment = await analyzeSentiment({ content: "The market reacted strongly..." });
 * console.log(sentiment); // "positive"
 * ```
 *
 * @param article - Partial article containing optional textual content.
 * @returns A sentiment label string.
 *
 * @remarks
 * This is a placeholder implementation using a general-purpose sentiment model.
 * You may later upgrade to:
 *   - Domain-specific sentiment models (e.g., political news sentiment)
 *   - Multilingual sentiment models for KR, JP, EU news
 *   - Models stored on IPFS for decentralized loading
 */
export async function analyzeSentiment(article: {
	content?: string;
}): Promise<ArticleAnalyzed["sentiment"]> {
	const { content } = article ?? "";
	if (!content || content.trim().length === 0) {
		console.warn("Tokenizer skipped: empty input");
		return "";
	}

	// Load tokenizer
	const tokenizer = await getTokenizer();

	// Encode and truncate to first 128 tokens for efficiency
	const tokens = tokenizer.encode(content);
	if (tokens.length === 0) {
		console.warn("Tokenizer produced empty token array. Using fallback.");
		return "";
	}

	const truncatedTokens = tokens.slice(0, 128);
	const inputText = tokenizer.decode(truncatedTokens);

	// Load (or reuse) cached classifier pipeline
	const classifier = await getPipeline("text-classification", "distilbert-sst2");

	const output = await classifier(inputText);

	const label = output?.[0]?.label?.toLowerCase() ?? "neutral";

	console.log(
		`Performing sentiment analysis on ${tokens.length} tokens (truncated to ${truncatedTokens.length})`,
	);

	return label as ArticleAnalyzed["sentiment"];
}
