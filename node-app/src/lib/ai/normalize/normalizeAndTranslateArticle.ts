// src/lib/ai/normalize/normalizeAndTranslateArticle.ts

import { summarizeContentAI } from "@/lib/ai/summarizer";
import { translateContentAI } from "@/lib/ai/translate";
import type { NormalizedArticleResults } from "@/types";
import { extractTagsAI } from "./extractTagsAI";
import { cleanHTML } from "./utils";

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
): Promise<NormalizedArticleResults> {
	const errors: string[] = [];
	const content = cleanHTML(rawHTML);

	let translation: string | undefined;
	let language: string | undefined;

	// 1. Translation (if requested)
	try {
		const result = await translateContentAI(content, targetLanguage);
		translation = result.translation ?? content;
		language = result.language;
		if (result.errors?.length) errors.push(...result.errors);
		console.log(
			`[normalizeAndTranslateArticle] content was translated: ${translation}`,
		);
	} catch (err) {
		const msg = (err as Error)?.message ?? "Unknown translation error";
		console.warn("[normalizeAndTranslateArticle] translation failed:", msg);
		translation = content;
		errors.push(msg);
	}

	// 2. Summarization
	let summary = "";
	try {
		summary = await summarizeContentAI(translation ?? content);
	} catch (err) {
		const msg = (err as Error)?.message ?? "Unknown summarization error";
		console.warn("[normalizeAndTranslateArticle] summarization failed:", msg);
		summary =
			translation
				?.split(/(?<=[.!?])\s+/)
				.slice(0, 3)
				.join(" ") ?? "";
		errors.push(msg);
	}

	// 3. Tag extraction
	let tags: string[] = [];
	try {
		tags = await extractTagsAI(translation ?? content);
	} catch (err) {
		const msg = (err as Error)?.message ?? "Unknown tag extraction error";
		console.warn("[normalizeAndTranslateArticle] tag extraction failed:", msg);
		tags = [];
		errors.push(msg);
	}

	// Determine status
	let status: NormalizedArticleResults["status"] = "success";
	if (errors.length > 0 && (translation || summary || tags)) {
		status = "partial";
	} else if (errors.length > 0 && !translation && !summary && !tags) {
		status = "error";
	}

	return {
		content: translation ?? content,
		summary,
		tags,
		language,
		errors: errors.length > 0 ? errors : undefined,
		status,
	};
}
