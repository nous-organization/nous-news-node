import type { Article, NormalizerFn } from "@/types";

/**
 * Normalizer for Hacker News item JSON.
 */
export const normalizeHackerNews: NormalizerFn = (item, source): Article => {
	const url =
		item.url && typeof item.url === "string"
			? item.url
			: `https://news.ycombinator.com/item?id=${item.id}`;

	return {
		id: String(item.id),
		title: item.title ?? "Untitled",
		url,
		content: item.text ?? "",
		summary: item.text ?? "",
		categories: ["hacker_news"],
		tags: [],
		language: "en",
		author: item.by ?? undefined,
		publishedAt: item.time ? new Date(item.time * 1000).toISOString() : undefined,
		edition: "other",
		analyzed: false,
		raw: item,
		sourceMeta: { name: source.name, bias: "center" },
	};
};
