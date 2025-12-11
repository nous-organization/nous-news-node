import type { Article } from "@/types";
import { getInstance } from "./setup";

/**
 * Get all local articles from OrbitDB.
 *
 * @returns Array of articles (empty array if none or on error)
 */
export async function getAll(): Promise<Article[]> {
	try {
		const db = getInstance();
		if (!db) {
			console.warn("articleLocalDB is not initialized");
			return [];
		}
		const results = await db.query(() => true);
		return Array.isArray(results) ? results : [];
	} catch (err) {
		console.error("Failed to query local articles:", (err as Error).message);
		return [];
	}
}
