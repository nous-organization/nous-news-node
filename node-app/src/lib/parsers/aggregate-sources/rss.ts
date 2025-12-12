// frontend/src/lib/parsers/rss.ts
import type { Article, Edition, ParserFn, Source, SourceMeta } from "@/types";
import { editions } from "@/types";

/**
 * RSS / Atom feed parser.
 *
 * Input is expected from RSS-to-JSON parser with:
 * {
 *   items: [
 *     {
 *       title: string,
 *       link: string,
 *       content?: string,
 *       description?: string,
 *       pubDate?: string,
 *       categories?: string[]
 *     }
 *   ]
 * }
 */
export const rssParser: ParserFn = (raw: any, source: Source): Article[] => {
	if (!raw || !Array.isArray(raw.items)) return [];

	return raw.items.map((item: any) => ({
		id: item.link ?? item.guid,
		title: item.title ?? "Untitled",
		url: item.link ?? "",
		content: item.content ?? item.description,
		summary: item.description,
		categories: item.categories ?? [],
		tags: item.tags ?? [],
		language: item.language,
		author: item.author,
		publishedAt: item.pubDate,
		edition: editions.includes(item.edition as Edition) ? (item.edition as Edition) : "other",
		analyzed: false,
		raw: item,
		sourceMeta: {
			name: source.name,
			bias: "center",
		} satisfies SourceMeta,
	}));
};
