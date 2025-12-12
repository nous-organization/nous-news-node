import { addDebugLog, log } from "@/lib/log";
import { getInstance } from "./setup";

/**
 * Delete a single article from the local OrbitDB by URL.
 *
 * @param url - The URL of the article to delete
 * @returns Promise<void>
 */
export async function deleteByUrl(url: string): Promise<void> {
	try {
		const db = getInstance();
		if (!db || typeof db.del !== "function") {
			throw new Error("DB instance is not ready or del method is unavailable");
		}

		await db.del(url);
		const msg = `Deleted article: ${url}`;
		log(msg);
		await addDebugLog({ message: msg, level: "info" });
	} catch (err) {
		console.error(
			"[deleteByUrl] Failed to delete article:",
			(err as Error).message,
		);
		throw new Error(`Failed to delete article: ${(err as Error).message}`);
	}
}
