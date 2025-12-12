// src/lib/articles/aggregate.ts
import type { Helia } from "helia";
import type { Article, ArticleAnalyzed, SourceArticleLink } from "@/types";
import { loadFullArticle } from "../article";
import { smartFetch } from "../fetch";

/**
 * Options for article aggregation.
 */
export interface AggregateOptions {
	/** Optional Helia instance to pull articles from IPFS */
	helia?: Helia;
	/** Target language for AI normalization + translation */
	language?: string;
	/** Timeout per article fetch+analysis, ms */
	timeoutMs?: number;
	/** Skip AI translation */
	skipTranslation?: boolean;
}

/**
 * Timeout wrapper for promise-based operations.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error(`Timeout after ${ms}ms`)),
			ms,
		);
		promise
			.then((value) => {
				clearTimeout(timer);
				resolve(value);
			})
			.catch((err) => {
				clearTimeout(timer);
				reject(err);
			});
	});
}

/**
 * Fetches the list of article metadata (links) from a single provider.
 *
 * This assumes each provider exposes an API route returning:
 * [
 *   { url, title, publishedAt, source }
 * ]
 */
export async function fetchArticleLinksFromSource(
	sourceEndpoint: string,
): Promise<SourceArticleLink[]> {
	const res = await smartFetch(sourceEndpoint);
	if (!res.ok) throw new Error(`Source fetch failed: ${res.status}`);
	return (await res.json()) as SourceArticleLink[];
}

/**
 * Normalize and fully resolve an article by:
 *   - Fetching content (from IPFS, or source URL)
 *   - Applying source-specific parser
 *   - Running AI normalization + translation
 *   - Running AI analysis
 */
async function resolveSingleArticle(
	meta: SourceArticleLink,
	opts: AggregateOptions,
): Promise<Article | ArticleAnalyzed | null> {
	const { helia, language = "en", timeoutMs = 10000 } = opts;

	// Build temporary Article metadata (no content yet).
	const baseArticle: Article = {
		id: crypto.randomUUID(),
		url: meta.url,
		title: meta.title ?? "",
		publishedAt: meta.publishedAt ?? null,
		source: meta.source,
		content: "",
		summary: "",
		tags: [],
		fetchedAt: null,
		analyzed: false,
		language,
	};

	try {
		// Run through the unified loader pipeline with timeout.
		return await withTimeout(loadFullArticle(baseArticle, helia), timeoutMs);
	} catch (err) {
		console.warn(`Failed resolving article ${meta.url}:`, err);
		return null;
	}
}

/**
 * Aggregate articles from multiple provider endpoints.
 *
 * These endpoints return article *metadata*, not content.
 * Content is resolved through:
 *   - IPFS → or → HTTP fetch
 *   - source parsers
 *   - AI normalization
 *   - AI analysis
 */
export async function aggregateArticlesFromSources(
	sourceEndpoints: string[],
	opts: AggregateOptions = {},
): Promise<(Article | ArticleAnalyzed)[]> {
	const allLinks: SourceArticleLink[] = [];

	// Step 1: Fetch metadata links from all sources.
	for (const endpoint of sourceEndpoints) {
		try {
			const links = await fetchArticleLinksFromSource(endpoint);
			allLinks.push(...links);
		} catch (err) {
			console.warn(`Failed to fetch metadata from ${endpoint}:`, err);
		}
	}

	// Step 2: Resolve + analyze each article fully.
	const results: (Article | ArticleAnalyzed)[] = [];

	for (const link of allLinks) {
		const resolved = await resolveSingleArticle(link, opts);
		if (resolved) results.push(resolved);
	}

	return results;
}

/**
 * Convenience: aggregate articles from a single source provider.
 */
export async function aggregateArticlesFromSingleSource(
	sourceEndpoint: string,
	opts: AggregateOptions = {},
): Promise<(Article | ArticleAnalyzed)[]> {
	return aggregateArticlesFromSources([sourceEndpoint], opts);
}
