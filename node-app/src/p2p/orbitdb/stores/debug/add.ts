// src/p2p/orbitdb/stores/debug/add.ts
import { log } from "@/lib/log";
import type { DebugLogEntry } from "@/types/log";
import { getInstance } from "./setup";

/**
 * Add a new debug log entry to the OrbitDB debug store.
 *
 * @param entry - The debug log entry to add
 */
export async function add(entry: DebugLogEntry): Promise<void> {
	const db = getInstance();
	if (!db) {
		log("⚠️ Debug DB instance is not initialized", "warn");
		return;
	}

	try {
		await db.put(entry);
		log(`📝 Debug log added: ${entry.timestamp} - ${entry.message}`);
	} catch (err) {
		log(`❌ Failed to add debug log: ${(err as Error).message}`, "error");
	}
}
