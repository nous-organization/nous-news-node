// frontend/src/lib/db-debug.ts
import { Documents, type OrbitDB } from "@orbitdb/core";
import { log } from "@/lib/log.server";
import type { DebugLogEntry } from "@/types/log";
import { loadDBPaths, saveDBPaths } from "./setup";

// Explicit type for the debug DB instance
export interface DebugDB {
	db: any;
	add: (entry: DebugLogEntry) => Promise<void>;
	getAll: () => Promise<DebugLogEntry[]>;
}

// Keep a singleton for debugDB
let debugDBInstance: DebugDB | null = null;

/**
 * Sets up a debug logs DB in OrbitDB with error handling.
 * Safe to call multiple times; will return existing instance.
 *
 * @param orbitdb - Existing OrbitDB instance.
 * @param prefixPath - Folder holding OrbitDb databases
 * @returns DB instance and helper methods for logging and retrieving entries.
 */
export async function setupDebugDB(orbitdb: OrbitDB, prefixPath: string) {
	if (debugDBInstance) {
		log("🟢 Debug DB already initialized, skipping setup");
		return debugDBInstance;
	}

	const savedPaths = loadDBPaths();
	const dbName = savedPaths?.debug ? `${prefixPath}${savedPaths.debug}` : "nous.debug.logs";

	let db: any;
	try {
		// Pass the generator function, not the result
		db = await orbitdb.open(dbName, {
			Database: Documents({ indexBy: "timestamp" }) as any, // cast to satisfy TS
			meta: { indexBy: "timestamp" },
		});

		// Save back path for future loads
		saveDBPaths({ ...savedPaths, debug: db.address.toString() });

		log(`✅ Debug DB opened with address: ${db.address?.toString()}`);
	} catch (err) {
		const message = (err as Error).message || "Unknown error opening debug DB";
		log(`❌ Failed to open Debug DB: ${message}`, "error");

		// Optional: fallback to an in-memory DB
		db = await orbitdb.open("nous.debug.logs.inmemory", {
			Database: Documents({ indexBy: "timestamp" }) as any,
			meta: { indexBy: "timestamp" },
			// Or other flag for in-memory depending on OrbitDB config
		});
		log("⚠️ Fallback to in-memory Debug DB");
	}

	// Listen for updates from peers
	db.events.on("update", async (entry: any) => {
		// log(`🔄 Debug update from peer: ${JSON.stringify(entry)}`);
		const entries = await db.query(() => true);
		log(`📦 Debug DB entries: ${entries.length}`);
	});

	// Add a new debug entry
	async function add(entry: DebugLogEntry) {
		try {
			await db.put(entry);
			log(`📝 Debug log added: ${entry.timestamp} - ${entry.message}`);
		} catch (err) {
			log(`❌ Failed to add debug log: ${(err as Error).message}`, "error");
		}
	}

	// Retrieve all debug entries
	async function getAll(): Promise<DebugLogEntry[]> {
		try {
			return (await db.query(() => true)) ?? [];
		} catch (err) {
			log(`❌ Failed to query debug DB: ${(err as Error).message}`, "error");
			return [];
		}
	}

	debugDBInstance = { db, add, getAll };

	// Write initial startup log only if DB empty
	try {
		const existingEntries = await db.query(() => true);
		if (existingEntries.length === 0) {
			await add({
				_id: crypto.randomUUID(),
				timestamp: new Date().toISOString(),
				message: "Node debug DB initialized",
				level: "info",
				meta: { port: process.env.HTTP_PORT || "unknown" },
			});
		}
	} catch (err) {
		log(`❌ Failed to initialize debug DB entries: ${(err as Error).message}`, "error");
	}

	return debugDBInstance;
}
