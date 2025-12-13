// src/p2p/orbitdb/stores/articles/federated/setup.ts
import { Documents, IPFSAccessController, type OrbitDB } from "@orbitdb/core";
import { log } from "@/lib/log";
import { loadDBPaths, saveDBPaths } from "@/p2p/orbitdb/db-paths";

let articleFederatedDB: any | null = null;

/**
 * Initialize the federated Articles DB in OrbitDB.
 * This only sets up the database; all save/query logic lives elsewhere.
 *
 * @param orbitdb - OrbitDB instance
 * @param prefixPath - DB folder prefix
 */
export async function setup(
	orbitdb: OrbitDB,
	prefixPath: string,
): Promise<any> {
	if (articleFederatedDB) {
		log("🟢 Federated Articles DB already initialized");
		return articleFederatedDB;
	}

	const savedPaths = loadDBPaths();
	const dbName = savedPaths?.federated
		? `${prefixPath}${savedPaths.federated}`
		: "nous.articles.federated";

	const db = await orbitdb.open(dbName, {
		Database: Documents({ indexBy: "cid" }) as any,
		AccessController: IPFSAccessController({ write: ["*"] }),
		meta: { indexBy: "cid" },
	});

	saveDBPaths({ ...savedPaths, federated: db.address.toString() });

	db.events.on("replicated", (addr: string) => {
		log(`🔄 Federated Articles DB replicated from ${addr}`);
	});

	articleFederatedDB = db;
	log("📦 Federated Articles DB initialized");

	return articleFederatedDB;
}

/**
 * Retrieve the initialized federated articles DB.
 */
export function getInstance() {
	if (!articleFederatedDB) {
		throw new Error(
			"Federated DB not initialized. Call setupArticleFederatedDB() first.",
		);
	}
	return articleFederatedDB;
}
