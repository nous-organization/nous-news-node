import type { Helia } from "helia";
import type { ArticleAnalyzed } from "@/types";
import type { Article } from "@/types/article";
import { analyzeArticle } from "./ai";
import {
	type NormalizedArticle,
	normalizeAndTranslateArticle,
} from "./ai/normalize.server";
import { smartFetch } from "./fetch.server";
import { fetchArticleFromIPFS } from "./ipfs.server";
import { getParserForUrl } from "./parsers/sources";

/**
 * Fetch content from a remote URL
 * @param url - Source URL
 * @returns Text content
 */
export async function fetchFromSource(url: string): Promise<string> {
	const res = await smartFetch(url);
	if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
	return await res.text();
}

/**
 * Fetch a full article from IPFS if available
 * @param article - Article metadata
 * @param helia - Helia node
 * @returns Article or null if not found
 */
export async function fetchFromIPFS(
	article: Article | ArticleAnalyzed,
	helia: Helia,
): Promise<Article | ArticleAnalyzed | null> {
	if (!article.ipfsHash || !helia) return null;
	try {
		const fetched = await fetchArticleFromIPFS(helia, article.ipfsHash);
		return fetched ?? null;
	} catch (err) {
		console.warn(
			`IPFS fetch failed for ${article.id}: ${(err as Error).message}`,
		);
		return null;
	}
}

/**
 * Normalize content using AI: clean, summarize, extract tags
 * @param rawContent - Raw article text
 * @param language - Target language for translation (default: "en")
 * @returns Normalized article content
 */
export async function normalizeArticleWithAI(
	rawContent: string,
	language = "en",
): Promise<NormalizedArticle> {
	return await normalizeAndTranslateArticle(rawContent, language);
}

/**
 * Run AI analysis on enriched article
 * @param article - Article with raw content, summary, tags
 * @returns Analyzed article or null if failed
 */
export async function analyzeArticleAI(
	article: Article,
): Promise<ArticleAnalyzed | null> {
	try {
		const analyzed = await analyzeArticle(article);
		return analyzed ?? null;
	} catch (err) {
		console.warn(
			`AI analysis failed for article ${article.id}: ${(err as Error).message}`,
		);
		return null;
	}
}

/**
 * Load full article content using a 3-tier resolution strategy:
 *   1. Use existing content if available
 *   2. Load from IPFS via article.ipfsHash
 *   3. Fetch from source URL, run source-specific parser/normalization, then AI normalization and analysis
 *
 * @param article - Article metadata (may or may not include content)
 * @param helia - Helia node for IPFS operations (optional)
 * @returns Article or ArticleAnalyzed with guaranteed content, summary, and tags
 */
export async function loadFullArticle(
	article: Article | ArticleAnalyzed,
	helia?: Helia,
): Promise<Article | ArticleAnalyzed> {
	// 1️⃣ Return early if already has content + summary + analyzed
	if (article.content && article.summary && article.analyzed) return article;

	// 2️⃣ Try fetching from IPFS
	let ipfsVersion: Article | ArticleAnalyzed | null = null;
	if (helia) {
		try {
			ipfsVersion = await fetchFromIPFS(article, helia);
		} catch (err: any) {
			console.warn(`IPFS fetch failed for ${article.id}: ${err.message}`);
		}
	}
	if (ipfsVersion) return ipfsVersion;

	// 3️⃣ Fetch from source URL
	if (!article.url) return article;

	let raw = "";
	try {
		raw = await fetchFromSource(article.url);
	} catch (err: any) {
		console.warn(
			`Network fetch failed for article ${article.id}: ${err.message}`,
		);
		return article; // return whatever we have
	}

	let content: string = raw; // default fallback
	let summary = "";
	let tags: string[] = [];

	// --- Source-specific parser/normalization ---
	try {
		const parser = getParserForUrl(article.url);
		if (parser) {
			content = parser(raw) ?? raw;
		}

		console.log("parsed content", content);

		// === Placeholder for source-specific normalization ===
		// You can replace this with calls to your backend normalizers
		// @see src/lib/normalizers/sources/index.ts
		// Example:
		// const normalizer = getNormalizerForHostname(new URL(article.url).hostname);
		// if (normalizer) {
		//     const normalizedArticle = normalizer({ ...article, content }, article.url);
		//     content = normalizedArticle.content ?? content;
		//     summary = normalizedArticle.summary ?? summary;
		//     tags = normalizedArticle.tags ?? tags;
		// }
	} catch (err: any) {
		console.warn(
			`Source-specific parser failed for article ${article.id}: ${err.message}`,
		);
	}

	// --- AI normalization and summarization ---
	try {
		const aiRes = await normalizeArticleWithAI(
			content ?? raw,
			article.language ?? "en",
		);
		content = aiRes.content ?? content;
		summary = aiRes.summary ?? summary;
		tags = aiRes.tags ?? [];
	} catch (err: any) {
		console.warn(
			`AI normalization/summarization failed for article ${article.id}: ${err.message}`,
		);
		// Fallback: use raw content and a simple summary
		summary =
			raw
				.split(/(?<=[.!?])\s+/)
				.slice(0, 3)
				.join(" ") || raw;
		tags = [];
	}

	// --- Prepare enriched base article ---
	const enrichedBase: Article = {
		...article,
		raw,
		content,
		summary,
		tags,
		fetchedAt: new Date().toISOString(),
		analyzed: false,
	};

	// --- AI analysis ---
	let analyzed: ArticleAnalyzed | null = null;
	try {
		analyzed = await analyzeArticleAI(enrichedBase);
	} catch (err: any) {
		console.warn(
			`AI analysis failed for article ${article.id}: ${err.message}`,
		);
	}

	// Return analyzed version if available, otherwise enriched base
	return analyzed ?? enrichedBase;
}
