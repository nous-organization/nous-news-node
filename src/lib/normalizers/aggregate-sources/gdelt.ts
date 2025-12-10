import type { Article, NormalizerFn, Source, SourceMeta } from "@/types";

/**
 * Normalizer for GDELT API entries.
 *
 * Converts parsed GDELT articles into the normalized Article type,
 * filling as many fields as possible.
 */
export const normalizeGdelt: NormalizerFn = (a: Article, source: Source): Article => {
	return {
		id: a.id ?? crypto.randomUUID(),
		url: a.url,
		title: a.title ?? "Untitled",
		source: a.source ?? a.author ?? null,
		sourceDomain: a.sourceDomain ?? a.author ?? null,
		sourceType: "gdelt",

		image: a.image ?? null,
		mobileUrl: a.mobileUrl ?? null,
		sourceCountry: a.sourceCountry ?? null,
		language: a.language ?? null,
		publishedAt: a.publishedAt ?? null,

		summary: a.summary ?? "",
		content: a.content ?? "",
		categories: a.categories ?? [],
		tags: a.tags ?? [],

		edition: a.edition ?? "international",
		analyzed: a.analyzed ?? false,
		confidence: a.confidence ?? 0.8,

		raw: a.raw,
		sourceMeta: a.sourceMeta ?? ({ name: a.source ?? "GDELT", bias: "center" } as SourceMeta),
		fetchedAt: a.fetchedAt ?? new Date().toISOString(),
	};
};
