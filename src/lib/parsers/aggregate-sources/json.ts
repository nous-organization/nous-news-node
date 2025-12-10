// frontend/src/lib/parsers/json.ts
import type { Article, Edition, ParserFn, Source, SourceMeta } from "@/types";
import { editions, PoliticalBiasValues } from "@/types";

/**
 * JSON API parser.
 *
 * Assumes the source returns an object with:
 * {
 *   articles: [
 *     {
 *       title: string,
 *       url: string,
 *       content?: string,
 *       description?: string,
 *       imageUrl?: string,
 *       publishedAt?: string,
 *       ...
 *     }
 *   ]
 * }
 */
export const jsonParser: ParserFn = (raw: { articles: any }, source: Source): Article[] => {
	if (!raw || !Array.isArray(raw.articles)) return [];

	return raw.articles.map((a: any) => {
		const summary = a.summary || a.description || null;
		const content = a.content || a.summary || null;
		return {
			id: crypto.randomUUID(),
			title: a.title ?? "Untitled",
			url: a.url ?? "",
			content: content,
			summary: summary,
			image: a.imageUrl ?? a.urlToImage,
			categories: a.categories ?? [],
			tags: a.tags ?? [],
			language: a.language,
			author: a.author,
			publishedAt: a.publishedAt ?? a.published_date,
			edition: editions.includes(a.edition as Edition) ? (a.edition as Edition) : "other",
			analyzed: false,
			raw: a,
			sourceMeta: {
				name: source.name,
				bias: PoliticalBiasValues.includes(a.bias as any) ? (a.bias as any) : "center",
			} satisfies SourceMeta,
		};
	});
};
