// src/p2p/orbitdb/stores/articles/analyzed/add.ts
import { log } from "@/lib/log";
import type { ArticleAnalyzed } from "@/types";
import { getArticleAnalyzedDB } from "./setup";

/**
 * Add a new entry to the analyzed articles DB
 */
export async function add(entry: ArticleAnalyzed, skipExists = false) {
	// Replace 'any' with proper type
	const db = getArticleAnalyzedDB();
	if (skipExists) {
		const exists = await db.get(entry.id);
		if (exists) return null;
	}
	try {
		await db.put(entry);
		log(`📝 Analyzed article added: ${entry.id}`);
	} catch (err) {
		log(
			`❌ Failed to add analyzed article: ${(err as Error).message}`,
			"error",
		);
	}
	return entry;
}
