import type { Article } from "@/types";
import { add } from "./add";

/**
 * Add multiple articles, skipping duplicates.
 *
 * Automatically uses Helia singleton for IPFS storage if initialized.
 *
 * @param articles - Array of articles to add
 * @returns Number of articles actually added
 */
export async function addUnique(articles: Article[]): Promise<number> {
	let added = 0;

	for (const article of articles) {
		try {
			const result = await add(article, false); // `false` = skip duplicate check internally
			if (result) added++;
		} catch (err) {
			console.warn(
				`[addUnique] Failed to add article ${article.url}:`,
				(err as Error).message,
			);
		}
	}

	return added;
}
