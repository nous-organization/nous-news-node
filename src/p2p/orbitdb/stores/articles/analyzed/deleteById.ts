import { addDebugLog, log } from "@/lib/log"; // adjust path if needed
import { getInstance } from "./setup";

/**
 * Delete an analyzed article by ID
 * @param id - Article ID to delete
 */
export async function deleteById(id: string): Promise<void> {
	const db = getInstance();
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
