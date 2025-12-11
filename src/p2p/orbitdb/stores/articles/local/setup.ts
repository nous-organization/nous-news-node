// src/p2p/orbitdb/stores/articles/local/setup.ts
import { Documents, IPFSAccessController, type OrbitDB } from "@orbitdb/core";
import { log } from "@/lib/log";
import { loadDBPaths, saveDBPaths } from "@/p2p/orbitdb/db-paths";

/** Local DB singleton */
let articleLocalDB: any | null = null;

/**
 * Initialize the local Articles OrbitDB.
 * This file ONLY sets up & returns the DB.
 *
 * Safe to call repeatedly — it returns the existing DB if already initialized.
 */
export async function setup(
	orbitdb: OrbitDB,
	prefixPath: string,
): Promise<any> {
	if (articleLocalDB) {
		log("🟢 ArticleLocalDB already initialized");
		return articleLocalDB;
	}

	// Restore DB path from disk if present
	const savedPaths = loadDBPaths();
	const dbName = savedPaths?.articles
		? `${prefixPath}${savedPaths.articles}`
		: "nous.articles.feed";

	const db = (await orbitdb.open(dbName, {
		Database: Documents({ indexBy: "url" }) as any,
		AccessController: IPFSAccessController({ write: ["*"] }),
		meta: { indexBy: "url" },
	})) as any;

	// Save address for next session
	saveDBPaths({ ...savedPaths, articles: db.address.toString() });

	// Optional: observe replication/update if needed
	db.events.on("replicated", (addr: string) => {
		log(`🔄 Local Articles DB replicated from ${addr}`);
	});

	articleLocalDB = db;
	log("📦 ArticleLocalDB initialized");

	return articleLocalDB;
}

/**
 * Retrieve the already-running local articles DB.
 * (Loaded via setupArticleLocalDB)
 */
export function getInstance() {
	if (!articleLocalDB) {
		throw new Error(
			"ArticleLocalDB not initialized. Call setupArticleLocalDB() first.",
		);
	}
	return articleLocalDB;
}
