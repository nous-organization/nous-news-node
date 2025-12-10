// frontend/src/lib/parsers/gdelt.ts
import { type Article, ArticleSchema, type ParserFn, type Source, type SourceMeta } from "@/types";
import { dateToISO, mapCountryToEdition, safeUrl } from ".";

/**
 * GDELT parser.
 *
 * Converts GDELT API response to an array of normalized Article objects.
 *
 * GDELT v2 API format example:
 * {
 *   articles: [
 *     {
 *       url: string,
 *       url_mobile: string,
 *       title: string,
 *       summary: string,
 *       socialimage: string,
 *       domain: string,
 *       language: string,
 *       sourcecountry: string
 *     }
 *   ]
 * }
 */
export const gdeltParser: ParserFn = (raw: { articles: any }, source: Source): Article[] => {
	if (!raw || !Array.isArray(raw.articles)) return [];

	return raw.articles.map((a: any) => {
		const summary = a.summary || null;
		const content = a.content || a.summary || null;
		const article: Article = {
			id: crypto.randomUUID(),
			title: a.title ?? "Untitled",
			url: a.url,
			mobileUrl: safeUrl(a.url_mobile),
			content,
			summary,
			categories: a.categories ?? [],
			tags: a.tags ?? [],
			language: a.language ?? null,
			author: a.domain ?? source.name,
			publishedAt: dateToISO(a.seendate) ?? null,
			edition: mapCountryToEdition(a.sourcecountry),
			image: safeUrl(a.socialimage),
			analyzed: false,
			raw: a,
			sourceMeta: {
				name: source.name,
				bias: "unknown",
			} satisfies SourceMeta,
			fetchedAt: new Date().toISOString(),
		};

		// Validate safely
		return ArticleSchema.parse(article);
	});
};
