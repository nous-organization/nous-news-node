// src/p2p/orbitdb/stores/articles/analyzed/getAll.ts
import { log } from "@/lib/log";
import type { ArticleAnalyzed } from "@/types";
import { getInstance } from "./setup";

/**
 * Retrieve all entries from the analyzed articles OrbitDB.
 *
 * @returns Array of analyzed articles (empty array if none or on error)
 */
export async function getAll(): Promise<ArticleAnalyzed[]> {
	const db = getInstance();

	if (!db) {
		log("⚠️ Analyzed DB instance is not initialized", "warn");
		return [];
	}

	try {
		const articles: ArticleAnalyzed[] = (await db.query(() => true)) ?? [];
		return articles;
	} catch (err) {
		log(`❌ Failed to query analyzed DB: ${(err as Error).message}`, "error");
		return [];
	}
}
