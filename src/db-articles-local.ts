// frontend/src/p2p/db-articles-local.ts
import { Documents, IPFSAccessController, type OrbitDB } from "@orbitdb/core";
import type { Helia } from "helia";
import { smartFetch } from "@/lib/fetch.server";
import { addDebugLog, log } from "@/lib/log.server";
import { getNormalizer, normalizePublishedAt } from "@/lib/normalizers/aggregate-sources";
import { cleanArticlesForDB, getParser } from "@/lib/parsers/aggregate-sources";
import type { ArticleAnalyzed, Source } from "@/types";
import { type Article, ArticleSchema } from "@/types/article";
import { translateMultipleTitlesAI } from "./lib/ai/translate.server";
import { loadFullArticle } from "./lib/article.server";
import { saveArticleToIPFS } from "./lib/ipfs.server";
import { getRunningInstance } from "./node";
import { loadDBPaths, saveDBPaths } from "./setup";

/**
 * Explicit type for the local articles DB instance
 */
export interface ArticleLocalDB {
	articleLocalDB: any; // OrbitDB instance (type-safe document DB typing is difficult)

	/**
	 * Save a single article to the DB if it does not already exist
	 */
	saveLocalArticle: (
		doc: Article | ArticleAnalyzed,
		helia?: Helia,
		overwrite?: boolean,
	) => Promise<boolean | null>;

	/**
	 * Delete a single article by URL
	 */
	deleteLocalArticle: (url: string) => Promise<void>;

	/**
	 * Get all articles. Optionally filter by enabled sources.
	 */
	getAllLocalArticles: (sources?: Source[]) => Promise<Article[]>;

	/**
	 * Get a single article by the article's URL, internal ID, or IPFS CID
	 */
	getLocalArticle: (identifier: string) => Promise<Article | null>;

	/**
	 * Query articles using a custom predicate
	 */
	queryLocalArticles: (fn: (doc: Article) => boolean) => Promise<Article[]>;

	/**
	 * Add multiple articles, skipping duplicates
	 */
	addUniqueLocalArticles: (articles: Article[]) => Promise<number>;

	/**
	 * Fetch articles from external sources.
	 * Returns both fetched articles and per-source errors.
	 */
	fetchAllLocalSources: (
		sources: Source[],
		targetLanguage: string,
		since?: Date,
		skipTranslation?: boolean,
	) => Promise<{
		articles: Article[];
		errors: { endpoint: string; error: string }[];
	}>;

	/**
	 * Loads the full article content using a 3-tier resolution strategy
	 */
	getFullLocalArticle: (
		article: Article,
		helia: Helia,
		overwrite?: boolean,
	) => Promise<Article | ArticleAnalyzed>;
}

// Singleton instance
let articleLocalDBInstance: ArticleLocalDB | null = null;

/**
 * Sets up the articles local DB in OrbitDB using an existing OrbitDB instance.
 * Safe to call multiple times; returns existing instance if already initialized.
 *
 * @param orbitdb - Existing OrbitDB instance.
 * @param prefixPath - Folder holding OrbitDb databases
 * @returns DB instance and helper methods for articles (unanalyzed) management.
 */
export async function setupArticleLocalDB(
	orbitdb: OrbitDB,
	prefixPath: string,
): Promise<ArticleLocalDB> {
	if (articleLocalDBInstance) {
		log("🟢 Article Local DB already initialized, skipping setup");
		return articleLocalDBInstance;
	}

	const savedPaths = loadDBPaths();
	const dbName = savedPaths?.articles
		? `${prefixPath}${savedPaths.articles}`
		: "nous.articles.feed";

	const db = (await orbitdb.open(dbName, {
		Database: Documents({ indexBy: "url" }) as any, // cast to satisfy TS
		AccessController: IPFSAccessController({ write: ["*"] }),
		meta: { indexBy: "url" },
	})) as any;

	// Save back path for future loads
	saveDBPaths({ ...savedPaths, articles: db.address.toString() });

	// Listen for peer updates
	db.events.on("update", async (entry: any) => {
		// const msg = `🔄 Article Local update from peer: ${JSON.stringify(entry)}`;
		// log(JSON.stringify(msg, null, 2));
		// await addDebugLog({ message: msg, level: "info" });

		const all = await db.query(() => true);
		const countMsg = `📦 Articles in local DB: ${all.length}`;
		// log(countMsg);
		await addDebugLog({ message: countMsg, level: "info" });
	});

	// Listen for peer database replications
	db.events.on("replicated", (address: string) => {
		console.log("🔄 Local DB replicated from peer", address);
	});

	/**
	 * Save a single article to the local OrbitDB.
	 *
	 * This function **upserts** the document:
	 *   - If `overwrite` is `true` (default), it will replace any existing article with the same `url`.
	 *   - If `overwrite` is `false`, it will skip saving if the article already exists.
	 *
	 * Optionally adds content to IPFS if a Helia instance is provided.
	 *
	 * @param doc - The article to save (can be raw or analyzed)
	 * @param helia - Optional Helia reference for IPFS storage
	 * @param overwrite - If true, replace existing article with the same URL; if false, skip duplicates
	 * @returns `true` if saved, `null` if skipped due to duplicate
	 */
	async function saveLocalArticle(
		doc: Article | ArticleAnalyzed,
		helia?: Helia,
		overwrite = true,
	): Promise<boolean | null> {
		if (!overwrite) {
			const exists = await db.get(doc.url);
			if (exists) {
				log(`Skipping duplicate article: ${doc.id} / ${doc.url}`);
				return null;
			}
		}

		// Add to IPFS if Helia provided
		if (helia && doc.content && !doc.ipfsHash) {
			try {
				const cid = await saveArticleToIPFS(helia, doc);
				if (cid) doc.ipfsHash = cid;
			} catch (err) {
				log(`Failed to add content to IPFS for ${doc.url}: ${(err as Error).message}`, "warn");
			}
		}

		await db.put(doc); // Upsert! Overwrites if doc.url exists
		const msg = `Saved to local DB: ${doc.id} / ${doc.url}`;
		log(msg);
		await addDebugLog({ message: msg, level: "info" });
		return true;
	}

	/**
	 * Delete a single article by URL
	 * @param url - Article URL to delete
	 */
	async function deleteLocalArticle(url: string) {
		await db.del(url);
		const msg = `Deleted from sources DB: ${url}`;
		log(msg);
		await addDebugLog({ message: msg, level: "info" });
	}

	/**
	 * Fetch articles from enabled sources, parse and normalize them,
	 * validate against the Article schema, and collect any per-source errors.
	 *
	 * @param availableSources - Array of sources to fetch from
	 * @param targetLanguage - Optional BCP-47 language code for translation (default: "en")
	 * @param skipTranslation - Optional flag to skip translating titles
	 * @returns Object containing normalized articles and an array of per-source errors
	 */
	async function fetchAllLocalSources(
		availableSources: Source[],
		targetLanguage: string,
		since?: Date,
		skipTranslation = true,
	): Promise<{ articles: Article[]; errors: { endpoint: string; error: string }[] }> {
		const enabledSources = availableSources.filter((s) => s.enabled);
		const allArticles: Article[] = [];
		const errors: { endpoint: string; error: string }[] = [];

		for (const source of enabledSources) {
			try {
				log(`Fetching articles from source: ${source.endpoint}`);
				const response = await smartFetch(source.endpoint);

				if (!response.ok) {
					const msg = `Failed to fetch from ${source.endpoint}: HTTP ${response.status}`;
					log(msg, "warn");
					errors.push({ endpoint: source.endpoint, error: msg });
					continue;
				}

				const rawData = await response.json();

				log(`Parsing Article with: ${source.parser}`);
				log(`Normalizing Article with: ${source.normalizer}`);

				const parserFn = getParser(source);
				const normalizerFn = getNormalizer(source);

				const parsedArticles = parserFn(rawData, source);

				if (!Array.isArray(parsedArticles)) {
					const msg = `Parser did not return an array of articles for ${source.endpoint}`;
					log(msg, "warn");
					errors.push({ endpoint: source.endpoint, error: msg });
					continue;
				}

				const normalizedArticles: Article[] = [];
				for (const a of parsedArticles) {
					const n = normalizerFn(a, source);
					n.publishedAt = normalizePublishedAt(n.publishedAt);

					if (since && n.publishedAt && new Date(n.publishedAt) < since) continue;

					normalizedArticles.push(n);
				}

				// Only translate if skipTranslation is false
				if (!skipTranslation && targetLanguage && normalizedArticles.length > 0) {
					const titlesToTranslate = normalizedArticles.map((a) => a.title ?? "");
					try {
						const translatedTitles = await translateMultipleTitlesAI(
							titlesToTranslate,
							targetLanguage,
						);
						translatedTitles.forEach((t, idx) => {
							normalizedArticles[idx].title = t;
						});
					} catch (err) {
						console.warn(
							`Failed to translate titles for articles from ${source.endpoint}:`,
							(err as Error).message,
						);
					}
				}

				const cleanArticles = cleanArticlesForDB(normalizedArticles);

				for (const article of cleanArticles) {
					try {
						ArticleSchema.parse(article);
						allArticles.push(article);
					} catch (err) {
						const msg = `Invalid article structure from ${source.endpoint}: ${(err as Error).message}`;
						log(msg, "warn");
						errors.push({ endpoint: source.endpoint, error: msg });
					}
				}

				log(`Fetched ${cleanArticles.length} articles from ${source.endpoint}`);
			} catch (err) {
				const msg = (err as Error).message;
				log(`Error fetching from ${source.endpoint}: ${msg}`, "error");
				errors.push({ endpoint: source.endpoint, error: msg });
			}
		}

		log(`Total articles fetched from all sources: ${allArticles.length}`);
		return { articles: allArticles, errors };
	}

	/**
	 * Get all articles, optionally filtered by enabled sources
	 * @param sources Optional array of sources to filter by endpoint
	 */
	async function getAllLocalArticles(sources?: Source[]): Promise<Article[]> {
		let articles = (await db.query(() => true)) ?? [];
		if (sources && sources.length > 0) {
			const enabledEndpoints = new Set(sources.filter((s) => s.enabled).map((s) => s.endpoint));
			articles = articles.filter((a: Article) => enabledEndpoints.has(a.source || ""));
		}
		return articles;
	}

	/**
	 * Get a single article by URL, ID, or IPFS CID
	 * @param identifier - The article's URL, internal ID, or IPFS CID
	 */
	async function getLocalArticle(identifier: string): Promise<Article | null> {
		// 1. Direct match by URL (primary key)
		let results = await db.query((doc: Article) => doc.url === identifier);
		if (results.length > 0) return results[0];

		// 2. Match by internal ID
		results = await db.query((doc: Article) => doc.id === identifier);
		if (results.length > 0) return results[0];

		// 3. Match by IPFS CID
		results = await db.query((doc: Article) => doc.ipfsHash === identifier);
		if (results.length > 0) return results[0];

		// 4. Match by normalized URL (common issue)
		results = await db.query(
			(doc: Article) => doc.url.replace(/\/$/, "") === identifier.replace(/\/$/, ""),
		);
		if (results.length > 0) return results[0];

		return null;
	}

	/**
	 * Query articles using a custom predicate
	 * @param fn Predicate function
	 */
	async function queryLocalArticles(fn: (doc: Article) => boolean): Promise<Article[]> {
		return await db.query(fn);
	}

	/**
	 * Add multiple articles, skipping duplicates
	 * @param newArticles Array of articles to add
	 * @param helia Helia reference
	 */
	async function addUniqueLocalArticles(newArticles: Article[]): Promise<number> {
		const runningInstance = getRunningInstance();
		if (!runningInstance) return 0;
		const { helia } = runningInstance;
		let added = 0;
		for (const article of newArticles) {
			const exists = await db.get(article.url);
			if (!exists) {
				await saveLocalArticle(article, helia, true);
				added++;
			} else {
				log(`Skipped existing article: ${article.url}`);
			}
		}
		return added;
	}

	/**
	 * Load full article content using a 3-tier resolution strategy:
	 *   1. Use content already on the article object
	 *   2. Load full Article from IPFS via article.ipfsHash
	 *   3. Fetch from the source endpoint, parse, normalize, analyze, save to IPFS + OrbitDB
	 *
	 * Cached results are always stored back into OrbitDB.
	 *
	 * @async
	 * @param article - Article metadata (may or may not include content)
	 * @param helia - Active Helia node
	 * @returns Article with guaranteed `.content` and `.summary` if retrievable
	 */
	async function getFullLocalArticle(
		article: Article,
		helia: Helia,
		overwrite?: boolean,
	): Promise<Article | ArticleAnalyzed> {
		// Return early if fully analyzed
		if (article.content && article.summary && article.analyzed) return article;

		let finalVersion: Article | ArticleAnalyzed;

		try {
			// Delegate the heavy lifting to loadFullArticle from server lib
			finalVersion = await loadFullArticle(article, helia);
		} catch (err) {
			log(`Failed to load full article for ${article.id}: ${(err as Error).message}`, "warn");
			return article;
		}

		// Save locally via OrbitDB
		try {
			await saveLocalArticle(finalVersion, helia, overwrite);
		} catch (err) {
			log(`Failed to save article locally for ${article.id}: ${(err as Error).message}`, "warn");
		}

		// Save to IPFS if Helia node provided
		if (helia) {
			try {
				const cid = await saveArticleToIPFS(helia, finalVersion);
				finalVersion.ipfsHash = cid;
			} catch (err) {
				log(`Failed to save article to IPFS for ${article.id}: ${(err as Error).message}`, "warn");
			}
		}

		return finalVersion;
	}

	// Save singleton
	articleLocalDBInstance = {
		articleLocalDB: db,
		saveLocalArticle,
		deleteLocalArticle,
		getAllLocalArticles,
		getLocalArticle,
		queryLocalArticles,
		addUniqueLocalArticles,
		fetchAllLocalSources,
		getFullLocalArticle,
	};

	log(`✅ Local Article DB setup complete with ${db.address?.toString()}`);

	return articleLocalDBInstance;
}
