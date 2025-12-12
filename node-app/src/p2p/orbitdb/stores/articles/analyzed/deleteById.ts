// src/p2p/orbitdb/stores/articles/analyzed/deleteById.ts
import { addDebugLog, log } from "@/lib/log";
import { getInstance } from "./setup";

/**
 * Delete an analyzed article by its ID.
 *
 * @param id - The ID of the analyzed article to delete
 */
export async function deleteById(id: string): Promise<void> {
	const db = getInstance();

	if (!db) {
		log("⚠️ Analyzed DB instance is not initialized", "warn");
		return;
	}

	try {
		await db.del(id);
		const msg = `Deleted analyzed article: ${id}`;
		log(msg);

		// Optionally add a debug log entry
		await addDebugLog({
			message: msg,
			level: "info",
		});
	} catch (err) {
		log(
			`❌ Failed to delete analyzed article ${id}: ${(err as Error).message}`,
			"error",
		);
	}
}
