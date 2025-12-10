// src/db-articles-analyzed.ts
/**
 * @file OrbitDB setup and DB operations for Nous P2P Node (Analyzed DB)
 * @description
 * Sets up the "nous.analyzed.feed" database in OrbitDB and provides helper
 * functions for saving, deleting, querying, and retrieving AI-analyzed articles.
 */

import { Documents, IPFSAccessController, type OrbitDB } from "@orbitdb/core";
import { addDebugLog, log } from "@/lib/log";
import type { ArticleAnalyzed } from "@/types";
import { loadDBPaths, saveDBPaths } from "./setup";

/**
 * Interface for the Analyzed DB instance and its helpers
 */
export interface ArticleAnalyzedDB {
	articleAnalyzedDB: any; // OrbitDB instance
	saveAnalyzedArticle: (
		doc: ArticleAnalyzed,
		skipExists?: boolean,
	) => Promise<ArticleAnalyzed | null>;
	deleteAnalyzedArticle: (id: string) => Promise<void>;
	getAllAnalyzedArticles: () => Promise<ArticleAnalyzed[]>;
	getAnalyzedArticle: (id: string) => Promise<ArticleAnalyzed | null>;
	queryAnalyzedArticles: (
		fn: (doc: ArticleAnalyzed) => boolean,
	) => Promise<ArticleAnalyzed[]>;
}

// Singleton instance
let articleAnalyzedDBInstance: ArticleAnalyzedDB | null = null;

/**
 * Sets up the analyzed articles DB in OrbitDB using an existing OrbitDB instance.
 * Safe to call multiple times; returns existing instance if already initialized.
 *
 * This database holds AI-enriched content derived from the source articles,
 * including cognitive bias, sentiment, antithesis, political bias, and other metadata.
 *
 * @param orbitdb - Existing OrbitDB instance
 * @param prefixPath - Folder holding OrbitDb databases
 * @returns Analyzed DB instance with helper methods
 */
export async function setupArticleAnalyzedDB(
	orbitdb: OrbitDB,
	prefixPath: string,
): Promise<ArticleAnalyzedDB> {
	if (articleAnalyzedDBInstance) {
		log("🟢 Analyzed DB already initialized, skipping setup");
		return articleAnalyzedDBInstance;
	}

	const savedPaths = loadDBPaths();
	const dbName = savedPaths?.analyzed
		? `${prefixPath}${savedPaths.analyzed}`
		: "nous.analyzed.feed";

	const db = (await orbitdb.open(dbName, {
		Database: Documents({ indexBy: "id" }) as any, // cast to satisfy TS
		AccessController: IPFSAccessController({ write: ["*"] }),
		meta: { indexBy: "id" },
	})) as any;

	// Save back path for future loads
	saveDBPaths({ ...savedPaths, analyzed: db.address.toString() });

	// Listen for updates from peers
	db.events.on("update", async (entry: any) => {
		const msg = `🔄 Analyzed DB update from peer: ${JSON.stringify(entry)}`;
		log(JSON.stringify(msg, null, 2));
		await addDebugLog({ message: msg, level: "info" });

		const all = await db.query(() => true);
		const countMsg = `📦 Analyzed articles in DB: ${all.length}`;
		log(countMsg);
		await addDebugLog({ message: countMsg, level: "info" });
	});

	// Listen for peer database replications
	db.events.on("replicated", (address: string) => {
		console.log("🔄 Analyzed DB replicated from peer", address);
	});

	/** Save an analyzed article */
	async function saveAnalyzedArticle(doc: ArticleAnalyzed, skipExists = false) {
		if (skipExists) {
			const exists = await db.get(doc.id);
			if (exists) return null;
		}
		await db.put(doc);
		log(`Saved analyzed article: ${doc.id}`);
		await addDebugLog({
			message: `Saved analyzed article: ${doc.id}`,
			level: "info",
		});
		return doc;
	}

	/** Delete an analyzed article by ID */
	async function deleteAnalyzedArticle(id: string) {
		await db.del(id);
		const msg = `Deleted analyzed article: ${id}`;
		log(msg);
		await addDebugLog({ message: msg, level: "info" });
	}

	/** Get all analyzed articles */
	async function getAllAnalyzedArticles(): Promise<ArticleAnalyzed[]> {
		return (await db.query(() => true)) ?? [];
	}

	/** Get a single analyzed article by ID */
	async function getAnalyzedArticle(
		id: string,
	): Promise<ArticleAnalyzed | null> {
		return (await db.get(id)) ?? null;
	}

	/** Query analyzed articles using a predicate function */
	async function queryAnalyzedArticles(
		fn: (doc: ArticleAnalyzed) => boolean,
	): Promise<ArticleAnalyzed[]> {
		return await db.query(fn);
	}

	// Save singleton
	articleAnalyzedDBInstance = {
		articleAnalyzedDB: db,
		saveAnalyzedArticle,
		deleteAnalyzedArticle,
		getAllAnalyzedArticles,
		getAnalyzedArticle,
		queryAnalyzedArticles,
	};
	log(`✅ Analyzed Article DB setup complete with ${db.address?.toString()}`);

	return articleAnalyzedDBInstance;
}
