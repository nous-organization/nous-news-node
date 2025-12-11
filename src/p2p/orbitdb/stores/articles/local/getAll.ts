import type { Article } from "@/types";
import { getInstance } from "./setup";

/** Get all local articles, optionally filtered by sources */
export async function getAll(): Promise<Article[]> {
	const { articleLocalDB: db } = getInstance();
	return (await db.query(() => true)) ?? [];
}
