import { summarizeContentAI } from "@/lib/ai/summarizer";
import type { NormalizedArticleResults } from "@/types/results";
import { extractTagsAI } from "./extractTagsAI";
import { cleanHTML } from "./utils";

/**
 * Full AI-enhanced normalization pipeline.
 * Cleans HTML, summarizes, extracts tags, returns normalized article content.
 * Token-aware truncation is applied to avoid model memory/index issues.
 * @param rawHTML - Raw HTML from source or IPFS
 * @returns Object with content, summary, and tags
 */
export async function normalizeArticleAI(
	rawHTML: string,
): Promise<NormalizedArticleResults> {
	const errors: string[] = [];
	const content = cleanHTML(rawHTML);

	// 1. Summarization
	let summary = "";
	try {
		summary = await summarizeContentAI(content);
	} catch (err) {
		const msg = (err as Error)?.message ?? "Unknown summarization error";
		console.warn("[normalizeArticleAI] summarization failed:", msg);
		summary =
			content
				?.split(/(?<=[.!?])\s+/)
				.slice(0, 3)
				.join(" ") ?? "";
		errors.push(msg);
	}

	// 2. Tag extraction
	let tags: string[] = [];
	try {
		tags = await extractTagsAI(content);
	} catch (err) {
		const msg = (err as Error)?.message ?? "Unknown tag extraction error";
		console.warn("[normalizeArticleAI] tag extraction failed:", msg);
		tags = [];
		errors.push(msg);
	}

	// Determine status
	let status: NormalizedArticleResults["status"] = "success";
	if (errors.length > 0 && (summary || tags)) {
		status = "partial";
	} else if (errors.length > 0 && !summary && !tags) {
		status = "error";
	}

	return {
		content,
		summary,
		tags,
		errors: errors.length > 0 ? errors : undefined,
		status,
	};
}
