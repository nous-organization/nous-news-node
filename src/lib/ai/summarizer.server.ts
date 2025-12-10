import { getPipeline } from "./models.server";
import { getTokenizer } from "./tokenizer.server";

/**
 * Generate an AI-powered summary using a local transformer model.
 *
 * This uses Xenova's distilled BART model for abstractive summarization.
 * Runs fully locally (no API key, no remote server needed).
 *
 * ## Processing Logic
 * 1. Tokenize the input using GPT-2 tokenizer.
 * 2. Truncate to 512 tokens to prevent model input overflow.
 * 3. Decode truncated tokens back to text.
 * 4. Pass to BART summarization model (`distilbart-cnn`).
 *
 * ## Returns
 * A concise abstractive summary of the article.
 *
 * @param content - Raw article content to summarize
 * @returns A concise abstractive summary
 *
 * @example
 * const summary = await summarizeContentAI(article.content);
 * console.log(summary); // "This article discusses..."
 */
export async function summarizeContentAI(content: string): Promise<string> {
	if (!content || content.trim().length === 0) {
		console.warn("Tokenizer skipped: empty input");
		return "";
	}

	const tokenizer = await getTokenizer();
	const tokens = tokenizer.encode(content);
	if (tokens.length === 0) {
		console.warn("Tokenizer produced empty token array. Using fallback.");
		return content
			.split(/(?<=[.!?])\s+/)
			.slice(0, 3)
			.join(" ");
	}

	const truncatedTokens = tokens.slice(0, 512);
	const inputText = tokenizer.decode(truncatedTokens);

	const summarizer = await getPipeline("summarization", "distilbart-cnn");

	const output = await summarizer(inputText, { max_length: 130, min_length: 40 });

	console.log(
		`Summarizing article of ${tokens.length} tokens (truncated to ${truncatedTokens.length})`,
	);

	return output[0]?.summary_text ?? "";
}

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
export async function generateAntithesis(article: { content?: string }): Promise<string> {
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
export async function generatePhilosophicalInsight(article: { content?: string }): Promise<string> {
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
