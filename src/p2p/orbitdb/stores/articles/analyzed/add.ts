// src/p2p/orbitdb/stores/articles/analyzed/add.ts
import { log } from "@/lib/log";
import type { ArticleAnalyzed } from "@/types";
import { getInstance } from "./setup";

/**
 * Add a new entry to the analyzed articles OrbitDB.
 *
 * @param entry - The analyzed article to add
 * @param skipExists - If true, skip checking for duplicates
 * @returns The added entry, or null if it already exists or on error
 */
export async function add(
	entry: ArticleAnalyzed,
	skipExists = false,
): Promise<ArticleAnalyzed | null> {
	const db = getInstance();

	try {
		if (!skipExists) {
			const exists = await db.get(entry.id);
			if (exists) {
				log(`⚠️ Analyzed article already exists: ${entry.id}`);
				return null;
			}
		}

		await db.put(entry);
		log(`📝 Analyzed article added: ${entry.id}`);
		return entry;
	} catch (err) {
		log(
			`❌ Failed to add analyzed article ${entry.id}: ${(err as Error).message}`,
			"error",
		);
		return null;
	}
}
