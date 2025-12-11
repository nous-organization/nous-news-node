// src/p2p/orbitdb/stores/articles/analyzed/getAll.ts
import { log } from "@/lib/log";
import type { ArticleAnalyzed } from "@/types";
import { getInstance } from "./setup";

/**
 * Retrieve all entries from the analyzed articles DB
 */
export async function getAll(): Promise<ArticleAnalyzed[]> {
	// Replace 'any' with proper type
	const db = getInstance();
	try {
		return (await db.query(() => true)) ?? [];
	} catch (err) {
		log(`❌ Failed to query analyzed DB: ${(err as Error).message}`, "error");
		return [];
	}
}
