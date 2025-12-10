// frontend/src/p2p/db-articles-federated.ts
import { dagCbor } from "@helia/dag-cbor";
import type { Helia } from "helia";
import { CID } from "multiformats/cid";
import { addDebugLog, log } from "@/lib/log.server";
import type { ArticleFederated } from "@/types";

export interface ArticleFederatedDB {
	articleFederatedDB: ArticleFederated[];
	saveFederatedArticle: (ptr: ArticleFederated) => Promise<void>;
	getFederatedArticles: () => Promise<ArticleFederated[]>;
	queryFederatedArticles: (fn: (ptr: ArticleFederated) => boolean) => Promise<ArticleFederated[]>;
	loadFederatedArticleContent?: (cid: string | CID) => Promise<any | null>;
}

// Singleton
let articleFederatedDBInstance: ArticleFederatedDB | null = null;

/**
 * Setup in-memory DB for federated articles with optional Helia instance
 */
export async function setupArticleFederatedDB(helia?: Helia): Promise<ArticleFederatedDB> {
	if (articleFederatedDBInstance) {
		log("🟢 Federated Article DB already initialized");
		return articleFederatedDBInstance;
	}

	const db: ArticleFederated[] = [];

	async function logUpdate(entry: ArticleFederated) {
		const msg = `🔄 Federated pointer updated: ${JSON.stringify(entry)}`;
		log(msg);
		await addDebugLog({ message: msg, level: "info" });
		await addDebugLog({ message: `📦 Total federated pointers: ${db.length}`, level: "info" });
	}

	async function saveFederatedArticle(ptr: ArticleFederated) {
		db.push(ptr);
		await logUpdate(ptr);
	}

	async function getFederatedArticles(): Promise<ArticleFederated[]> {
		return db;
	}

	async function queryFederatedArticles(
		fn: (ptr: ArticleFederated) => boolean,
	): Promise<ArticleFederated[]> {
		return db.filter(fn);
	}

	/** Helia fetch for full article content */
	async function loadFederatedArticleContent(cid: string | CID): Promise<any | null> {
		if (!helia) {
			log("⚠️ Helia instance not initialized");
			return null;
		}
		try {
			const dag = dagCbor(helia);
			const cidObj: CID = typeof cid === "string" ? CID.parse(cid) : cid;
			return await dag.get(cidObj);
		} catch (err) {
			log(`Error fetching content for CID ${cid}: ${err}`);
			return null;
		}
	}

	articleFederatedDBInstance = {
		articleFederatedDB: db,
		saveFederatedArticle,
		getFederatedArticles,
		queryFederatedArticles,
		loadFederatedArticleContent,
	};

	log("✅ Federated Article DB setup complete");
	return articleFederatedDBInstance;
}
