// src/p2p/orbitdb/stores/debug/getAll.ts
import { log } from "@/lib/log";
import type { DebugLogEntry } from "@/types/log";
import { getInstance } from "./setup";

export async function getAll(): Promise<DebugLogEntry[]> {
	const db = getInstance();

	try {
		return (await db.query(() => true)) ?? [];
	} catch (err) {
		log(`❌ Failed to query debug DB: ${(err as Error).message}`, "error");
		return [];
	}
}
