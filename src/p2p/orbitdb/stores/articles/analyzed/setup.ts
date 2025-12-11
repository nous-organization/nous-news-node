// src/p2p/orbitdb/stores/articles/analyzed/setup.ts
/**
 * @file OrbitDB setup for Nous P2P Node (Analyzed DB)
 * @description
 * Sets up the "nous.analyzed.feed" database in OrbitDB.
 * This module only initializes & returns the DB instance.
 * All save/query logic should live in a separate service layer.
 */

import { Documents, IPFSAccessController, type OrbitDB } from "@orbitdb/core";
import { log } from "@/lib/log";
import { loadDBPaths, saveDBPaths } from "@/p2p/orbitdb/db-paths";

/** Singleton instance */
let articleAnalyzedDB: any | null = null;

/**
 * Initialize the Analyzed Articles DB in OrbitDB.
 * Safe to call repeatedly — returns existing instance if already initialized.
 *
 * @param orbitdb - Existing OrbitDB instance
 * @param prefixPath - Folder holding OrbitDB databases
 * @returns OrbitDB instance for analyzed articles
 */
export async function setup(
	orbitdb: OrbitDB,
	prefixPath: string,
): Promise<any> {
	if (articleAnalyzedDB) {
		log("🟢 Analyzed DB already initialized");
		return articleAnalyzedDB;
	}

	// Restore DB path from disk if present
	const savedPaths = loadDBPaths();
	const dbName = savedPaths?.analyzed
		? `${prefixPath}${savedPaths.analyzed}`
		: "nous.analyzed.feed";

	const db = (await orbitdb.open(dbName, {
		Database: Documents({ indexBy: "id" }) as any,
		AccessController: IPFSAccessController({ write: ["*"] }),
		meta: { indexBy: "id" },
	})) as any;

	// Save address for next session
	saveDBPaths({ ...savedPaths, analyzed: db.address.toString() });

	// Optional: observe replication/update
	db.events.on("replicated", (addr: string) => {
		log(`🔄 Analyzed DB replicated from ${addr}`);
	});

	articleAnalyzedDB = db;
	log("📦 Analyzed DB initialized");

	return articleAnalyzedDB;
}

/**
 * Retrieve the already-initialized analyzed articles DB.
 */
export function getInstance() {
	if (!articleAnalyzedDB) {
		throw new Error(
			"Analyzed DB not initialized. Call setupArticleAnalyzedDB() first.",
		);
	}
	return articleAnalyzedDB;
}
