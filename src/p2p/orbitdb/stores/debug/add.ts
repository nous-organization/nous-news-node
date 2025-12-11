// src/p2p/orbitdb/stores/debug/add.ts
import { log } from "@/lib/log";
import type { DebugLogEntry } from "@/types/log";
import { getInstance } from "./setup";

export async function add(entry: DebugLogEntry) {
	const db = getInstance();

	try {
		await db.put(entry);
		log(`📝 Debug log added: ${entry.timestamp} - ${entry.message}`);
	} catch (err) {
		log(`❌ Failed to add debug log: ${(err as Error).message}`, "error");
	}
}
