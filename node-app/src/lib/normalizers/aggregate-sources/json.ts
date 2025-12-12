// frontend/src/lib/normalizers/json.ts
/**
 * Normalizer for generic JSON API entries.
 *
 * Converts a raw JSON object or partially parsed Article from a source
 * into a fully normalized `Article` object suitable for storage in OrbitDB.
 * Ensures all required fields are populated and an `id` is always assigned.
 *
 * @param a - Raw article object or partially parsed Article
 * @param source - Source metadata for the article
 * @returns Normalized `Article` object
 */
import type { Article, Edition, NormalizerFn, Source, SourceMeta } from "@/types";
import { editions } from "@/types";

/**
 * Normalizer for generic JSON API entries.
 *
 * Converts a raw JSON object or partially parsed Article from a source
 * into a fully normalized `Article` object suitable for storage in OrbitDB.
 * Ensures all required fields are populated and an `id` is always assigned.
 *
 * @param a - Raw article object or partially parsed Article
 * @param source - Source metadata for the article
 * @returns Normalized `Article` object
 */
export const normalizeJson: NormalizerFn = (a: Article, source: Source): Article => {
	return {
		// Always ensure an ID is present
		id: a.id ?? a.url ?? crypto.randomUUID(),

		// Core fields
		title: a.title ?? "Untitled",
		url: a.url ?? "",
		content: a.content ?? "",
		summary: a.summary ?? "",
		image: a.image,
		categories: a.categories ?? [],
		tags: a.tags ?? [],
		language: a.language ?? null,
		author: a.author ?? null,
		publishedAt: a.publishedAt ? new Date(a.publishedAt).toISOString() : null,

		// Edition fallback: must match known editions
		edition: editions.includes(a.edition as Edition) ? (a.edition as Edition) : "other",

		// Flags
		analyzed: a.analyzed ?? false,

		// Raw object for audit/debug
		raw: a.raw,

		// Source metadata
		sourceMeta:
			a.sourceMeta ??
			({
				name: source.name,
				bias: source.bias ?? "center",
			} as SourceMeta),

		// Timestamp
		fetchedAt: a.fetchedAt ?? new Date().toISOString(),

		// Optional additional fields for consistency
		source: a.source ?? source.name,
		sourceDomain: a.sourceDomain ?? null,
		sourceType: a.sourceType ?? "json",
		mobileUrl: a.mobileUrl ?? null,
		sourceCountry: a.sourceCountry ?? null,
		confidence: a.confidence ?? 0.8,
	};
};
