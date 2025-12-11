import type { ArticleFederated } from "@/types";
import { getInstance } from "./setup";

/**
 * Query federated articles using a predicate function.
 *
 * This function allows you to filter federated article pointers in the DB
 * according to any arbitrary condition.
 *
 * Example usage:
 * ```ts
 * const recentArticles = await query(article => new Date(article.timestamp) > someDate);
 * const bbcArticles = await query(article => article.source === "bbc.com");
 * ```
 *
 * @param fn - A predicate function that receives an ArticleFederated and returns `true` to include it
 * @returns A promise resolving to an array of ArticleFederated objects that satisfy the predicate
 */
export async function query(
	fn: (article: ArticleFederated) => boolean,
): Promise<ArticleFederated[]> {
	const db = getInstance();
	return (await db.query(fn)) ?? [];
}
