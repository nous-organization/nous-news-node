import type { Article } from "@/types";
import { getInstance } from "./setup";

/** Get a single article by URL, ID, or IPFS CID */
export async function getByIdentifier(
	identifier: string,
): Promise<Article | null> {
	const { articleLocalDB: db } = getInstance();
	let res = await db.query((a: Article) => a.url === identifier);
	if (res.length) return res[0];
	res = await db.query((a: Article) => a.id === identifier);
	if (res.length) return res[0];
	res = await db.query((a: Article) => a.ipfsHash === identifier);
	if (res.length) return res[0];
	return null;
}
