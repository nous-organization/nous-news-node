// src/lib/articles/analyze.ts

import { analyzeArticle } from "@/lib/ai";
import type { Article, ArticleAnalyzed } from "@/types";

/**
 * Perform AI-based analysis on a full article unless it has already been analyzed.
 *
 * Behavior:
 * - If `fullArticle.analyzed` is true, returns the article unchanged.
 * - Otherwise, calls the AI model to analyze the article.
 * - The analyzed output is wrapped with additional metadata:
 *    - `id`: A new UUID for the analyzed record
 *    - `originalId`: The ID of the source article
 *    - `url`: The original article’s URL
 *    - `title`: The original article’s title
 *    - `analyzed: true`
 *
 * Notes:
 * - This function does **not** save the analyzed article; callers must persist it.
 * - Ensures a consistent schema for all AI-analyzed results.
 *
 * @param fullArticle - The full article object to analyze.
 * @returns The analyzed article with enriched metadata.
 */
export async function analyzeFullArticle(
	fullArticle: Article,
): Promise<ArticleAnalyzed> {
	// Already analyzed → return as-is
	if (fullArticle.analyzed) {
		return fullArticle as ArticleAnalyzed;
	}

	// Run AI analysis
	const analyzed = await analyzeArticle(fullArticle as Article);

	// Attach required metadata and mark as analyzed
	return {
		...analyzed,
		id: crypto.randomUUID(),
		originalId: fullArticle.id,
		url: fullArticle.url,
		title: fullArticle.title,
		analyzed: true,
	} as ArticleAnalyzed;
}
