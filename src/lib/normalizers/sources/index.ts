// src/lib/normalizers/sources/index.ts
import type { ArticleNormalizer } from "@/types/normalizer";

/**
 * Placeholder normalizer functions for each source.
 * Each normalizer should implement the ArticleNormalizer signature:
 *   (article: any, source?: string) => any
 *
 * Right now, these just return the input article unchanged.
 * Replace with actual normalization logic per source as needed.
 */

// Example source-specific normalizers
export const normalizers: Record<string, ArticleNormalizer> = {
	"nytimes.com": (article) => {
		// TODO: implement NYTimes-specific normalization
		return article;
	},
	"theverge.com": (article) => {
		// TODO: implement The Verge-specific normalization
		return article;
	},
	"bbc.com": (article) => {
		// TODO: implement BBC-specific normalization
		return article;
	},
	"washingtonpost.com": (article) => {
		// TODO: implement Washington Post-specific normalization
		return article;
	},
};

/**
 * Generic fallback normalizer
 */
export const genericNormalizer: ArticleNormalizer = (article) => {
	// TODO: implement generic normalization logic
	return article;
};

/**
 * Retrieve the normalizer function for a given source URL or hostname.
 * Falls back to the generic normalizer if no source-specific normalizer is defined.
 *
 * @param hostname - Hostname or source identifier
 */
export function getNormalizerForHostname(hostname: string): ArticleNormalizer {
	// Remove "www." if present for consistency
	const normalizedHost = hostname.replace(/^www\./, "");
	return normalizers[normalizedHost] ?? genericNormalizer;
}
