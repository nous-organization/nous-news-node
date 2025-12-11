import type { Helia } from "helia";
import { saveArticleToIPFS } from "@/lib/ipfs";
import { addDebugLog, log } from "@/lib/log";
import { getHelia } from "@/p2p/helia";
import type { Article, ArticleAnalyzed } from "@/types";
import { getInstance } from "./setup";

/**
 * Save a single article to the local DB (upsert).
 *
 * - If the article already exists and `overwrite` is false, it will be skipped.
 * - Automatically adds content to IPFS using the global Helia singleton if available.
 *
 * @param doc - Article to save
 * @param overwrite - Replace existing article if true (default: true)
 * @returns true if saved, null if skipped
 */
export async function add(
	doc: Article | ArticleAnalyzed,
	overwrite = true,
): Promise<boolean | null> {
	const { articleLocalDB: db } = getInstance();

	if (!overwrite) {
		const exists = await db.get(doc.url);
		if (exists) return null;
	}

	// Automatically get Helia singleton
	let helia: Helia;
	try {
		helia = getHelia();
	} catch {
		log(`Helia is not intialized`);
		return false;
	}

	// Save content to IPFS if possible
	if (helia && doc.content && !doc.ipfsHash) {
		try {
			const cid = await saveArticleToIPFS(helia, doc);
			if (cid) doc.ipfsHash = cid;
		} catch (err) {
			log(`Failed IPFS save for ${doc.url}: ${(err as Error).message}`, "warn");
		}
	}

	await db.put(doc);
	await addDebugLog({ message: `Saved article: ${doc.url}`, level: "info" });
	return true;
}
