// src/p2p/orbitdb/stores/index.ts
import type { OrbitDB } from "@orbitdb/core";
import { log } from "@/lib/log";
import * as articleAnalyzedStore from "./articles/analyzed/setup";
import * as articleFederatedStore from "./articles/federated/setup";
import * as articleLocalStore from "./articles/local/setup";
import * as debugStore from "./debug/setup";

/**
 * Initialize all OrbitDB stores for the P2P node.
 * Safe to call multiple times; returns existing instances if already initialized.
 *
 * @param orbitdb OrbitDB instance
 * @param prefixPath Folder path for DB storage
 */
export async function setupAllDBs(orbitdb: OrbitDB, prefixPath: string) {
	log("🔵 Setting up all OrbitDB stores...");

	const [debugDB, localDB, federatedDB, analyzedDB] = await Promise.all([
		debugStore.setup(orbitdb, prefixPath),
		articleLocalStore.setup(orbitdb, prefixPath),
		articleFederatedStore.setup(orbitdb, prefixPath),
		articleAnalyzedStore.setup(orbitdb, prefixPath),
	]);

	log("✅ All OrbitDB stores initialized");

	return {
		debugDB,
		localDB,
		federatedDB,
		analyzedDB,
	};
}

/**
 * Retrieve all initialized DB instances as a single object.
 * Throws if any DB has not been initialized.
 */
export function getAllDBInstances() {
	return {
		debugDB: debugStore.getInstance(),
		localDB: articleLocalStore.getInstance(),
		federatedDB: articleFederatedStore.getInstance(),
		analyzedDB: articleAnalyzedStore.getInstance(),
	};
}
