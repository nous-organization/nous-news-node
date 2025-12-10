// src/lib/ai/index.ts

import type { Article } from "@/types/article";
import type { ArticleAnalyzed } from "@/types/article-analyzed";
import { detectCognitiveBias } from "./cognitiveBias.server";
import { detectPoliticalBias } from "./politicalBias.server";
import { analyzeSentiment } from "./sentiment.server";
import {
	generateAntithesis,
	generatePhilosophicalInsight,
} from "./summarizer.server";

/**
 * Main AI interface to analyze a single article.
 * Returns a fully enriched ArticleAnalyzed object.
 */
export async function analyzeArticle(
	article: Article,
): Promise<ArticleAnalyzed | null> {
	const content = article.content ?? "";

	// Return if no content found.
	if (content.length < 1) {
		return null;
	}

	const [politicalBias, sentiment, cognitiveBiases, antithesis, philosophical] =
		await Promise.all([
			detectPoliticalBias({ content }),
			analyzeSentiment({ content }),
			detectCognitiveBias({ content }),
			generateAntithesis({ content }),
			generatePhilosophicalInsight({ content }),
		]);

	return {
		...article,
		id: crypto.randomUUID(),
		originalId: article.id,
		title: article.title ?? "Untitled",
		url: article.url,
		content,
		analyzed: true,
		politicalBias,
		sentiment,
		cognitiveBiases,
		antithesis,
		philosophical,
		tags: article.tags ?? [],
		source: article.source ?? undefined,
		sourceType: article.sourceType ?? undefined,
		category: article.categories?.[0] ?? undefined,
		author: article.author ?? undefined,
		publishedAt: article.publishedAt ?? undefined,
		edition: article.edition ?? undefined,
		sourceMeta: article.sourceMeta ?? undefined,
		fetchedAt: article.fetchedAt ?? undefined,
		ipfsHash: article.ipfsHash ?? undefined,
		analysisTimestamp: new Date().toISOString(),
	} as ArticleAnalyzed;
}
