import { log } from "@/lib/log";
import type { ArticleFederated } from "@/types";
import { getInstance } from "./setup";

/**
 * Save a single federated article to the OrbitDB.
 *
 * @param article - Federated article to save
 */
export async function add(article: ArticleFederated): Promise<void> {
	try {
		const db = getInstance();
		if (!db || typeof db.put !== "function") {
			throw new Error(
				"Federated DB is not initialized or put method is unavailable",
			);
		}

		await db.put(article);
		log(`📝 Federated article saved: ${article.cid}`);
	} catch (err) {
		log(
			`❌ Failed to save federated article ${article.cid}: ${(err as Error).message}`,
			"error",
		);
	}
}
