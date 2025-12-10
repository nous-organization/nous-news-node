import { JSDOM } from "jsdom";
import { getPipeline } from "./models.server";
import { getTokenizer } from "./tokenizer.server";
import { translateContentAI } from "./translate.server";

/**
 * Example usage:
 * const normalized = await normalizeArticleAI(raw);
 * const enrichedBase: Article = {
 *    ...article,
 *    raw,
 *    content: normalized.content,
 *    summary: normalized.summary,
 *    tags: normalized.tags,
 * };
 */

export interface NormalizedArticle {
	content: string;
	summary: string;
	tags: string[];
}

function safeString(input?: string) {
	return typeof input === "string" ? input : "";
}

/**
 * Normalize messy HTML content into clean text.
 * - Removes <script>, <style>, <noscript>
 * - Removes hidden elements, ads, navs, headers, footers
 * - Removes common paywall overlays
 * - Collapses multiple spaces and newlines
 * @param html - The raw HTML content
 * @returns Cleaned text
 */
export function cleanHTML(html: string): string {
	if (!html) return "";

	const dom = new JSDOM(html);
	const doc = dom.window.document;

	const removeAll = (nodes: NodeListOf<Element>) => {
		nodes.forEach((el) => {
			el.remove(); // no return
		});
	};

	removeAll(doc.querySelectorAll("script, style, noscript"));
	removeAll(doc.querySelectorAll("header, footer, nav, aside"));
	removeAll(doc.querySelectorAll("[style*='display:none'], [hidden]"));
	removeAll(doc.querySelectorAll(".paywall, .overlay, .meteredContent, #gateway-content"));

	let content = doc.body.textContent?.trim() ?? "";
	content = content.replace(/\s+/g, " ").trim();

	return safeString(content);
}

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
		const tokenizer = await getTokenizer();
		const tokens = tokenizer.encode(content);

		// Guard: tokenizer may legitimately return zero tokens
		if (tokens.length === 0) {
			console.warn("Summarizer skipped: tokenizer produced zero tokens.");
			return fallbackSummary();
		}

		const truncatedTokens = tokens.slice(0, 512);

		// Guard: extremely rare, but truncation may produce zero tokens
		if (truncatedTokens.length === 0) {
			console.warn("Summarizer skipped: truncated token array is empty.");
			return fallbackSummary();
		}

		const truncated = tokenizer.decode(truncatedTokens);

		const summarizer = await getPipeline("summarization", "distilbart-cnn");
		const result = await summarizer(truncated, { max_length: 120 });

		return result[0]?.summary_text ?? fallbackSummary();
	} catch (err) {
		console.warn("AI summarization failed, using fallback:", (err as Error).message);
		return fallbackSummary();
	}
}

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
		const tokenizer = await getTokenizer();
		const tokens = tokenizer.encode(content);

		// Guard: tokenizer can legitimately return an empty array
		if (!tokens.length) {
			console.warn("Tag extraction skipped: tokenizer returned zero tokens.");
			return [];
		}

		const truncatedTokens = tokens.slice(0, 512);

		// Guard: can also be empty after truncation
		if (!truncatedTokens.length) {
			console.warn("Tag extraction skipped: truncated token array is empty.");
			return [];
		}

		const truncated = tokenizer.decode(truncatedTokens);

		const tagger = await getPipeline("token-classification", "bert-ner");
		const entities: any[] = await tagger(truncated, {
			aggregation_strategy: "simple",
		});

		const tags = entities
			.filter((e) => e.entity?.startsWith("B-") || e.entity?.startsWith("I-"))
			.map((e) => e.word.toLowerCase());

		return Array.from(new Set(tags));
	} catch (err) {
		console.warn("Tag extraction AI failed:", (err as Error).message);
		return [];
	}
}

/**
 * Full AI-enhanced normalization pipeline.
 * Cleans HTML, summarizes, extracts tags, returns normalized article content.
 * Token-aware truncation is applied to avoid model memory/index issues.
 * @param rawHTML - Raw HTML from source or IPFS
 * @returns Object with content, summary, and tags
 */
export async function normalizeArticleAI(rawHTML: string): Promise<NormalizedArticle> {
	const content = cleanHTML(rawHTML);
	const summary = await summarizeContentAI(content);
	const tags = await extractTagsAI(content);

	return { content, summary, tags };
}

/**
 * Full AI-enhanced normalization pipeline with optional translation.
 * Token-aware truncation is applied before AI calls.
 * @param rawHTML - Raw HTML from source or IPFS
 * @param targetLanguage - Optional BCP-47 language code for translation (defaults to English)
 * @returns Object with content, summary, tags
 */
export async function normalizeAndTranslateArticle(
	rawHTML: string,
	targetLanguage = "en",
): Promise<NormalizedArticle> {
	// 1. Clean HTML
	let content = cleanHTML(rawHTML);

	// 2. Optional translation
	content = await translateContentAI(content, targetLanguage);

	console.log(`[normalizeAndTranslateArticle] content was translated: ${content}`);

	// 3. Summarize and extract tags
	const summary = await summarizeContentAI(content);
	const tags = await extractTagsAI(content);

	return { content, summary, tags };
}

/**
 * Example usage:
 * const normalized = await normalizeArticleAI(rawHtmlString);
 * console.log(normalized.content, normalized.summary, normalized.tags);
 */
