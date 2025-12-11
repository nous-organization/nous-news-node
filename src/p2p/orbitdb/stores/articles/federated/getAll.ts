import type { ArticleFederated } from "@/types";
import { getInstance } from "./setup";

export async function getAll(): Promise<ArticleFederated[]> {
	const db = getInstance();
	return (await db.query(() => true)) ?? [];
}
