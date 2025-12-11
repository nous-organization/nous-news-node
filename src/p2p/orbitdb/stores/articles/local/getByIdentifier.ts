import type { Article } from "@/types";
import { getInstance } from "./setup";

/**
 * Retrieve a single article by its URL, ID, or IPFS hash.
 *
 * The function tries each identifier in order:
 * 1. `url`
 * 2. `id`
 * 3. `ipfsHash`
 *
 * @param identifier - The URL, ID, or IPFS CID of the article
 * @returns Promise resolving to the Article if found, or `null` if not found
 * @throws Error if the DB instance is not initialized or the query fails
 */
export async function getByIdentifier(
	identifier: string,
): Promise<Article | null> {
	try {
		const db = getInstance();
		if (!db || typeof db.query !== "function") {
			throw new Error(
				"DB instance is not ready or query method is unavailable",
			);
		}

		// Try URL
		let results = await db.query((a: Article) => a.url === identifier);
		if (Array.isArray(results) && results.length > 0) return results[0];

		// Try ID
		results = await db.query((a: Article) => a.id === identifier);
		if (Array.isArray(results) && results.length > 0) return results[0];

		// Try IPFS hash
		results = await db.query((a: Article) => a.ipfsHash === identifier);
		if (Array.isArray(results) && results.length > 0) return results[0];

		return null;
	} catch (err) {
		console.error("[getByIdentifier] Failed to fetch article:", err);
		throw new Error(
			`Failed to get article by identifier: ${(err as Error).message}`,
		);
	}
}
