import type { Article, NormalizerFn } from "@/types";

import { normalizeGdelt } from "./gdelt";
import { normalizeHackerNews } from "./hn";
import { normalizeJson } from "./json";
import { normalizeReddit } from "./reddit";
import { normalizeRss } from "./rss";

/**
 * Registry of normalizers.
 */
export const normalizers: Record<string, NormalizerFn> = {
	json: normalizeJson,
	rss: normalizeRss,
	gdelt: normalizeGdelt,
	reddit: normalizeReddit,
	hn: normalizeHackerNews,
};

/**
 * Retrieves a normalizer for a source.
 * Defaults to JSON normalizer.
 */
export function getNormalizer(source: { normalizer?: string }): NormalizerFn {
	const norm = source.normalizer ?? "json";
	return normalizers[norm] ?? normalizeJson;
}

/**
 * Safely converts a value into an ISO date string.
 *
 * Handles the following cases:
 * 1. Already a string → returns as is
 * 2. `Date` object → returns ISO string
 * 3. Any other value → attempts `new Date(value)`; returns ISO string if valid, else `undefined`
 *
 * @param value - The value to convert to ISO string
 * @returns ISO string if valid date, otherwise `undefined`
 */
export function normalizePublishedAt(value: unknown): string | undefined {
	if (!value) return undefined;

	if (typeof value === "string") return value;

	if (value instanceof Date) return value.toISOString();

	// fallback: try parsing as Date
	const parsed = new Date(value as any);
	if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();

	return undefined;
}

/**
 * Normalize a batch of articles' `publishedAt` property to ISO strings.
 *
 * @param articles - Array of articles to normalize
 * @returns New array of articles with `publishedAt` coerced to ISO strings
 */
export function normalizeArticlesPublishedAt(articles: Article[]): Article[] {
	return articles.map((a) => ({
		...a,
		publishedAt: normalizePublishedAt(a.publishedAt),
	}));
}