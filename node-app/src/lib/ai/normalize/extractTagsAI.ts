import { getPipeline } from "@/lib/ai/models";
import { getTokenizer } from "@/lib/ai/tokenizer";

/**
 * Use AI to extract relevant tags or keywords from the text content.
 *
 * This uses a local token-classification model (NER) to identify named
 * entities, topics, or important terms from the article content.
 *
 * ## Processing Logic
 * 1. Tokenize input using GPT-2 tokenizer.
 * 2. Abort early if tokenizer returns zero tokens.
 * 3. Truncate to the first 512 tokens for model safety.
 * 4. Decode tokens back to text.
 * 5. Run a BERT NER pipeline using Transformers.js:
 *    - Task: `"token-classification"`
 *    - Model: `"bert-ner"`
 *    - Aggregation strategy: `"simple"`
 * 6. Extract entity words (B-*, I-* labels).
 * 7. Return a unique list of lowercase tags.
 *
 * ## Error Handling
 * - If tokenization or inference fails, returns an empty array.
 * - Avoids “token_ids must be a non-empty array of integers” by ensuring
 *   decoded token arrays are never empty.
 *
 * @param content - The raw text to analyze for tags or keywords
 * @returns Array of extracted tags (lowercase, deduplicated)
 *
 * @example
 * const tags = await extractTagsAI(article.content);
 * console.log(tags); // ["apple", "ceo", "china", ...]
 */
export async function extractTagsAI(content: string): Promise<string[]> {
	if (!content) return [];

	try {
		// Remove control characters and normalize whitespace
		const normalizedContent = content
			.replace(/\p{C}/gu, " ")
			.replace(/\s+/g, " ")
			.trim();
		if (!normalizedContent) return [];

		const tokenizer = await getTokenizer();
		const tokens = tokenizer.encode(normalizedContent);

		// Remove any undefined or non-number tokens
		const validTokens = tokens.filter(
			(t): t is number => typeof t === "number",
		);

		if (!validTokens.length) {
			console.warn(
				"Tag extraction skipped: tokenizer produced no valid tokens.",
			);
			return [];
		}

		// Truncate safely
		const truncatedTokens = validTokens.slice(0, 512);
		if (!truncatedTokens.length) {
			console.warn("Tag extraction skipped: truncated token array is empty.");
			return [];
		}

		// Decode safely
		let truncatedText: string;
		try {
			truncatedText = tokenizer.decode(truncatedTokens);
		} catch (err) {
			console.warn(
				"Tag extraction decode failed, using fallback:",
				(err as Error).message,
			);
			truncatedText = normalizedContent;
		}

		if (!truncatedText) return [];

		// Run token-classification
		const tagger = await getPipeline("token-classification", "bert-ner");
		const entities: any[] = await tagger(truncatedText, {
			aggregation_strategy: "simple",
		});

		if (!Array.isArray(entities) || !entities.length) return [];

		// Extract B-* and I-* labels
		const tags = entities
			.filter((e) => e.entity?.startsWith("B-") || e.entity?.startsWith("I-"))
			.map((e) => e.word.toLowerCase());

		// Deduplicate
		return Array.from(new Set(tags));
	} catch (err) {
		console.warn("Tag extraction AI failed:", (err as Error).message);
		return [];
	}
}
