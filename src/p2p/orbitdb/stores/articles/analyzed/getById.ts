// src/p2p/orbitdb/stores/articles/analyzed/getById.ts
import { log } from "@/lib/log";
import type { ArticleAnalyzed } from "@/types";
import { getInstance } from "./setup";

/**
 * Retrieve a single analyzed article by its ID
 */
export async function getById(id: string): Promise<ArticleAnalyzed | null> {
	const db = getInstance();
	try {
		const result = await db.get(id); // OrbitDB Documents store supports get by index
		return result?.[0] ?? null; // `db.get(id)` returns an array
	} catch (err) {
		log(
			`❌ Failed to fetch analyzed article with ID ${id}: ${(err as Error).message}`,
			"error",
		);
		return null;
	}
}
