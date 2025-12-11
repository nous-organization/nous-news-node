import { log } from "@/lib/log";
import type { ArticleFederated } from "@/types";
import { getInstance } from "./setup";

export async function add(article: ArticleFederated) {
	const db = getInstance();
	try {
		await db.put(article);
		log(`📝 Federated article saved: ${article.cid}`);
	} catch (err) {
		log(
			`❌ Failed to save federated article ${article.cid}: ${(err as Error).message}`,
			"error",
		);
	}
}
