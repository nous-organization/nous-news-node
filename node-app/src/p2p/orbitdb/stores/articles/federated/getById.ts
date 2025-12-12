import { log } from "@/lib/log";
import type { ArticleFederated } from "@/types";
import { getInstance } from "./setup";

/**
 * Retrieve a federated article by CID
 * @param cid - The content identifier of the article
 * @returns ArticleFederated | null
 */
export async function getById(cid: string): Promise<ArticleFederated | null> {
	const db = getInstance();
	try {
		const all = await db.query(() => true);
		const article = all.find((a: ArticleFederated) => a.cid === cid) ?? null;
		return article;
	} catch (err) {
		log(
			`❌ Failed to fetch federated article by CID ${cid}: ${(err as Error).message}`,
			"error",
		);
		return null;
	}
}
