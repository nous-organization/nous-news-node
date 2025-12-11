import { log } from "@/lib/log";
import type { ArticleAnalyzed } from "@/types";
import { getInstance } from "./setup";

/**
 * Query analyzed articles using a predicate function
 * @param fn - Predicate function to filter articles
 */
export async function query(
	fn: (doc: ArticleAnalyzed) => boolean,
): Promise<ArticleAnalyzed[]> {
	const db = getInstance();
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
