import type { Article } from "@/types";
import { getInstance } from "./setup";

/** Query articles using a custom predicate */
export async function query(fn: (doc: Article) => boolean): Promise<Article[]> {
	const { articleLocalDB: db } = getInstance();
	return await db.query(fn);
}
