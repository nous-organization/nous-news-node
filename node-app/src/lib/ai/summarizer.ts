import { log } from "@/lib/log";
import { getPipeline } from "./models";
import { getTokenizer } from "./tokenizer";

/**
 * Use AI to generate a summary of text content.
 *
 * This function uses a local BART-based summarization model (`distilbart-cnn`)
 * running via Transformers.js. It performs token-aware truncation to prevent
 * the model from receiving overly long inputs and ensures that empty-token
 * cases do not trigger fatal runtime errors.
 *
 * ## Processing Logic
 * 1. Tokenize input using GPT-2 tokenizer.
 * 2. If tokenizer returns zero tokens, immediately use fallback summary.
 * 3. Truncate to the first 512 tokens for model safety.
 * 4. Decode tokens back to text.
 * 5. Run local summarization pipeline with `max_length: 120`.
 *
 * ## Fallback Behavior
 * If any error occurs — including tokenizer edge cases, model invocation issues,
 * or empty decoding — the function returns the first 3 sentences of the input.
 *
 * @param content - The text content to summarize
 * @returns AI-generated summary or fallback summary
 *
 * @example
 * const summary = await summarizeContentAI(article.content);
 * console.log(summary); // "This article discusses..."
 */
export async function summarizeContentAI(content: string): Promise<string> {
	if (!content || content.trim().length === 0) return "";

	// Fallback: first 3 sentences
	const fallbackSummary = () =>
		content
			.split(/(?<=[.!?])\s+/)
			.slice(0, 3)
			.join(" ");

	try {
		// Normalize content: remove control characters, collapse whitespace
		const normalizedContent = content
			.replace(/\p{C}/gu, " ")
			.replace(/\s+/g, " ")
			.trim();
		if (!normalizedContent) return fallbackSummary();

		const tokenizer = await getTokenizer();
		const tokens = tokenizer.encode(normalizedContent);

		// Filter out any undefined or invalid tokens
		const validTokens = tokens.filter(
			(t): t is number => typeof t === "number",
		);

		if (!validTokens.length) {
			console.warn("Summarizer skipped: tokenizer produced no valid tokens.");
			return fallbackSummary();
		}

		// Truncate safely
		const truncatedTokens = validTokens.slice(0, 512);
		if (!truncatedTokens.length) {
			console.warn("Summarizer skipped: truncated token array is empty.");
			return fallbackSummary();
		}

		// Decode safely
		let truncatedText: string;
		try {
			truncatedText = tokenizer.decode(truncatedTokens);
		} catch (err) {
			console.warn(
				"Summarizer decode failed, using fallback:",
				(err as Error).message,
			);
			truncatedText = normalizedContent;
		}

		if (!truncatedText) return fallbackSummary();

		// Run summarization pipeline
		const summarizer = await getPipeline("summarization", "distilbart-cnn");
		const result: any[] = await summarizer(truncatedText, { max_length: 120 });

		if (!result || !result.length) return fallbackSummary();

		log(`Summary generated: ${JSON.stringify(result)}`);

		return result[0]?.summary_text ?? fallbackSummary();
	} catch (err) {
		console.warn(
			"AI summarization failed, using fallback:",
			(err as Error).message,
		);
		return fallbackSummary();
	}
}
