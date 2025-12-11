// src/p2p/orbitdb/stores/debug/setup.ts
import { Documents, type OrbitDB } from "@orbitdb/core";
import { log } from "@/lib/log";
import { loadDBPaths, saveDBPaths } from "@/p2p/orbitdb/db-paths";

/** Singleton for the Debug DB instance */
let debugDBInstance: any | null = null;

/**
 * Initialize the Debug OrbitDB for logs.
 * Safe to call repeatedly — returns the existing DB if already initialized.
 *
 * @param orbitdb - OrbitDB instance
 * @param prefixPath - Folder holding OrbitDB databases
 * @returns OrbitDB instance for debug logs
 */
export async function setup(
	orbitdb: OrbitDB,
	prefixPath: string,
): Promise<any> {
	if (debugDBInstance) {
		log("🟢 Debug DB already initialized, skipping setup");
		return debugDBInstance;
	}

	const savedPaths = loadDBPaths();
	const dbName = savedPaths?.debug
		? `${prefixPath}${savedPaths.debug}`
		: "nous.debug.logs";

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

	// Save address for next session
	saveDBPaths({ ...savedPaths, debug: db.address.toString() });

	// Optional: observe updates/replication
	db.events.on("update", async () => {
		const entries = await db.query(() => true);
		log(`📦 Debug DB entries: ${entries.length}`);
	});

	debugDBInstance = db;

	log("📦 Debug DB initialized");
	return debugDBInstance;
}

/**
 * Retrieve the already-initialized Debug DB instance.
 */
export function getInstance() {
	if (!debugDBInstance) {
		throw new Error("Debug DB not initialized. Call setupDebugDB() first.");
	}
	return debugDBInstance;
}
