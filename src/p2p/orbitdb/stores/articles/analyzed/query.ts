// src/p2p/orbitdb/stores/articles/analyzed/query.ts
import { log } from "@/lib/log";
import type { ArticleAnalyzed } from "@/types";
import { getInstance } from "./setup";

/**
 * Query analyzed articles using a custom predicate function.
 *
 * @param fn - Predicate function to filter articles
 * @returns An array of matching articles, or an empty array if none found or on error
 */
export async function query(
	fn: (doc: ArticleAnalyzed) => boolean,
): Promise<ArticleAnalyzed[]> {
	const db = getInstance();

	if (!db) {
		log("⚠️ Analyzed DB instance is not initialized", "warn");
		return [];
	}

	try {
		return (await db.query(fn)) ?? [];
	} catch (err) {
		log(
			`❌ Failed to query analyzed articles: ${(err as Error).message}`,
			"error",
		);
		return [];
	}
}
