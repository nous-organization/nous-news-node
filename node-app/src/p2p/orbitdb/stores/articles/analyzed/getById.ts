// src/p2p/orbitdb/stores/articles/analyzed/getById.ts
import { log } from "@/lib/log";
import type { ArticleAnalyzed } from "@/types";
import { getInstance } from "./setup";

/**
 * Retrieve a single analyzed article by its ID.
 *
 * @param id - The unique ID of the analyzed article
 * @returns The article if found, or `null` if not found or on error
 */
export async function getById(id: string): Promise<ArticleAnalyzed | null> {
	const db = getInstance();

	if (!db) {
		log("⚠️ Analyzed DB instance is not initialized", "warn");
		return null;
	}

	try {
		// OrbitDB Documents store returns an array of results
		const result: ArticleAnalyzed[] = await db.get(id);
		return result?.[0] ?? null;
	} catch (err) {
		log(
			`❌ Failed to fetch analyzed article with ID ${id}: ${(err as Error).message}`,
			"error",
		);
		return null;
	}
}
