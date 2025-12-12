// src/p2p/orbitdb/stores/articles/local/getFullArticle.ts
import { loadFullArticle } from "@/lib/article";
import { saveArticleToIPFS } from "@/lib/ipfs";
import { log } from "@/lib/log";
import { getHelia } from "@/p2p/helia";
import type { Article, ArticleAnalyzed } from "@/types";
import { add } from "./add";

/**
 * Loads full content for an article using the 3-tier resolution strategy:
 * 1. Already on the article object
 * 2. IPFS via Helia singleton
 * 3. Fetch from source endpoint, parse, normalize
 *
 * Saves the resulting article back into OrbitDB and IPFS if possible.
 *
 * @param article - Article metadata
 * @param overwrite - Whether to overwrite existing article in DB (default: true)
 * @returns Article with guaranteed `.content` if retrievable
 */
export async function getFullArticle(
	article: Article,
	overwrite = true,
): Promise<Article | ArticleAnalyzed> {
	// Already has content + summary
	if (article.content && article.summary && article.analyzed) return article;

	let finalArticle: Article | ArticleAnalyzed;

	try {
		// Attempt to load full article from source / parsing / analysis
		finalArticle = await loadFullArticle(article, getHelia());
	} catch (err) {
		log(
			`Failed to load full article for ${article.id}: ${(err as Error).message}`,
			"warn",
		);
		return article;
	}

	// Save to OrbitDB local store
	try {
		await add(finalArticle, overwrite);
	} catch (err) {
		log(
			`Failed to save article locally for ${article.id}: ${(err as Error).message}`,
			"warn",
		);
	}

	// Save to IPFS if Helia initialized
	try {
		const helia = getHelia();
		if (helia && finalArticle.content && !finalArticle.ipfsHash) {
			const cid = await saveArticleToIPFS(helia, finalArticle);
			finalArticle.ipfsHash = cid;
		}
	} catch {
		// Helia may not be initialized — ignore
	}

	return finalArticle;
}
