import type { ArticleFederated } from "@/types";
import { getInstance } from "./setup";

/**
 * Get all federated articles from OrbitDB.
 *
 * @returns Array of federated articles (empty array if none or on error)
 */
export async function getAll(): Promise<ArticleFederated[]> {
	try {
		const db = getInstance();
		if (!db || typeof db.query !== "function") {
			console.warn("Federated DB is not initialized");
			return [];
		}

		const results = await db.query(() => true);
		return Array.isArray(results) ? results : [];
	} catch (err) {
		console.error(
			"Failed to query federated articles:",
			(err as Error).message,
		);
		return [];
	}
}
