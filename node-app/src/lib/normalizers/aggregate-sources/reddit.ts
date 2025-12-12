// frontend/src/lib/normalizers/reddit.ts
import type { Article, NormalizerFn, Source } from "@/types";

/**
 * Normalizer for Reddit JSON feed entries (/r/news).
 */
export const normalizeReddit: NormalizerFn = (a, source): Article => {
	return {
		id: a.id,
		title: a.title,
		url: "https://reddit.com" + a.permalink,
		content: a.selftext_html ?? a.selftext ?? "",
		summary: a.selftext,
		image: a.thumbnail && a.thumbnail.startsWith("http") ? a.thumbnail : undefined,
		categories: [],
		tags: a.link_flair_richtext?.map((t: any) => t.t) ?? [],
		language: "en",
		author: a.author,
		publishedAt: new Date(a.created_utc * 1000).toISOString(),
		edition: "other",
		analyzed: false,
		raw: a,
		sourceMeta: { name: source.name, bias: "center" },
	};
};
