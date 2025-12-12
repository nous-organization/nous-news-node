import type { Article } from "@/types";
import { getInstance } from "./setup";

/**
 * Query articles from the OrbitDB instance using a custom predicate function.
 *
 * Example:
 * ```ts
 * const englishArticles = await query(article => article.language === "en");
 * ```
 *
 * @param fn - Predicate function that receives an Article and returns true to include it in the results
 * @returns Promise resolving to an array of Articles matching the predicate
 * @throws Error if the DB instance is not initialized or the query fails
 */
export async function query(fn: (doc: Article) => boolean): Promise<Article[]> {
	try {
		const db = getInstance();
		if (!db || typeof db.query !== "function") {
			throw new Error(
				"DB instance is not ready or query method is unavailable",
			);
		}

		const results = await db.query(fn);

		// Ensure an array is always returned
		if (!Array.isArray(results)) {
			return [];
		}

		return results;
	} catch (err) {
		console.error("[query] Failed to fetch articles:", err);
		// Optionally, wrap or rethrow the error for upstream handling
		throw new Error(`Failed to query articles: ${(err as Error).message}`);
	}
}
