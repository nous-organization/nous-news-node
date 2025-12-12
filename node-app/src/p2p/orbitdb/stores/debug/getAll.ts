// src/p2p/orbitdb/stores/debug/getAll.ts
import { log } from "@/lib/log";
import type { DebugLogEntry } from "@/types/log";
import { getInstance } from "./setup";

/**
 * Retrieve all debug log entries from the OrbitDB debug store.
 *
 * @returns Array of debug log entries (empty array if none or on error)
 */
export async function getAll(): Promise<DebugLogEntry[]> {
	const db = getInstance();
	if (!db) {
		log("⚠️ Debug DB instance is not initialized", "warn");
		return [];
	}

	try {
		return (await db.query(() => true)) ?? [];
	} catch (err) {
		log(`❌ Failed to query debug DB: ${(err as Error).message}`, "error");
		return [];
	}
}
