// frontend/src/lib/normalizers/rss.ts
import type { Article, Edition, NormalizerFn, Source } from "@/types";
import { editions } from "@/types";

/**
 * Normalizer for standard RSS feed entries.
 */
export const normalizeRss: NormalizerFn = (item, source: Source): Article => {
	return {
		id: item.link ?? item.guid ?? crypto.randomUUID(),
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
		sourceMeta: { name: source.name, bias: source.bias },
	};
};
