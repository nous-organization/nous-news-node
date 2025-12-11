/**
 * @file route-sources.ts
 * @description Express routes for managing news sources and fetching articles.
 */

import type { Express, Request, Response } from "express";
import { DEFAULT_SOURCES } from "@/constants/sources";
import { getSourceMeta } from "@/lib/ai/sourceMeta";
import { translateMultipleTitlesAI } from "@/lib/ai/translate";
import { smartFetch } from "@/lib/fetch";
import { broadcast, log } from "@/lib/log";
import { getNormalizer } from "@/lib/normalizers/aggregate-sources";
import { cleanArticlesForDB, getParser } from "@/lib/parsers/aggregate-sources";
import { loadSources, saveSources } from "@/lib/sources";
import type { Source } from "@/types";
import { handleError } from "./helpers";

/**
 * Merge default sources with persisted sources, prioritizing persisted data.
 */
async function getMergedSources(): Promise<Source[]> {
	const persistedSourcesRaw = await loadSources();
	const persistedSources = persistedSourcesRaw ?? [];

	const merged = DEFAULT_SOURCES.map((defaultSource) => {
		const persisted = persistedSources.find(
			(s) => s.name === defaultSource.name,
		);
		return persisted ? { ...defaultSource, ...persisted } : defaultSource;
	});

	const extraPersisted = persistedSources.filter(
		(s) => !DEFAULT_SOURCES.some((d) => d.name === s.name),
	);

	return [...merged, ...extraPersisted];
}

/**
 * Fetch raw data from a single source endpoint
 */
async function fetchRawSourceData(source: Source) {
	const response = await smartFetch(source.endpoint);
	if (!response.ok) {
		throw new Error(
			`Failed to fetch from ${source.endpoint}: HTTP ${response.status}`,
		);
	}
	const rawData = await response.json();
	return rawData;
}

/**
 * Parse, normalize, translate, and validate articles for a single source
 */
async function parseAndNormalizeSource(
	rawData: any,
	source: Source,
	language: string,
	skipTranslation: boolean,
) {
	const parserFn = getParser(source);
	const normalizerFn = getNormalizer(source);
	const parsed = parserFn(rawData, source);

	if (!Array.isArray(parsed)) {
		throw new Error(`Parser did not return an array for ${source.endpoint}`);
	}

	const normalized = parsed.map((a) => normalizerFn(a, source));

	// Only broadcast after parsing, with the correct total count
	const total = normalized.length;

	// Now broadcast normalized-level progress
	normalized.forEach((article, index) => {
		broadcast({
			type: "source:fetch:progress",
			payload: {
				source: source.name,
				index,
				total,
				articleId: article.id,
			},
		});
	});

	// Translation only after progress becomes consistent
	if (!skipTranslation && language && total > 0) {
		const titles = normalized.map((a) => a.title ?? "");
		try {
			const translated = await translateMultipleTitlesAI(titles, language);
			translated.forEach((t, i) => {
				normalized[i].title = t;
			});
		} catch (err) {
			console.warn(
				`Failed to translate for ${source.endpoint}: ${(err as Error).message}`,
			);
		}
	}

	return cleanArticlesForDB(normalized);
}

/**
 * Run the full pipeline for a single source and broadcast progress via WebSocket
 */
export async function fetchArticlesForSingleSource(
	source: Source,
	language: string,
	skipTranslation: boolean,
) {
	try {
		broadcast({
			type: "source:fetch:start",
			payload: {
				source: source.name,
				message: `Starting fetch for ${source.name}`,
			},
		});

		const rawData = await fetchRawSourceData(source);
		// log(`[DEBUG] Fetched raw data: ${JSON.stringify(rawData)}}`)
		const articles = await parseAndNormalizeSource(
			rawData,
			source,
			language,
			skipTranslation,
		);
		log(`[DEBUG] Fetched articles: ${JSON.stringify(articles)}}`);

		broadcast({
			type: "source:fetch:done",
			payload: {
				source: source.name,
				count: articles.length,
				message: `Fetch completed for ${source.name}`,
			},
		});

		return articles;
	} catch (err: any) {
		broadcast({
			type: "source:fetch:error",
			payload: { source: source.name, message: err.message },
		});
		throw err;
	}
}

/**
 * GET /sources
 * Returns the list of configured news sources with optional metadata
 */
export async function getSourcesHandler(req: Request, res: Response) {
	try {
		const { withMeta } = req.query as Record<string, string>;
		let sources = await getMergedSources();

		if (withMeta === "true" && sources.length > 0) {
			const enriched = await Promise.all(
				sources.map(async (source) => {
					try {
						const meta = await getSourceMeta(source.name);
						return { ...source, meta };
					} catch (err) {
						log(
							`Failed to fetch metadata for ${source.name}: ${(err as Error).message}`,
							"warn",
						);
						return source;
					}
				}),
			);
			sources = enriched as any;
		}

		log(`📥 Fetched ${sources.length} sources`);
		return res.status(200).json(sources);
	} catch (err) {
		const msg = (err as Error).message || "Unknown error fetching sources";
		log(`❌ Error fetching sources: ${msg}`, "error");
		return handleError(res, msg, 500, "error");
	}
}

/**
 * POST /sources/update
 * Updates a source's configuration (e.g., enable/disable, API key, etc.)
 */
export async function updateSourceHandler(req: Request, res: Response) {
	try {
		log(
			`[DEBUG] updateSourceHandler called with body: ${JSON.stringify(req.body)}`,
		);

		const updatedSource = req.body as Partial<Source> & { name: string };

		if (!updatedSource.name) {
			return handleError(res, "Source name is required", 400, "warn");
		}

		const sourcesRaw = await loadSources();
		const sources = sourcesRaw ?? [];
		const index = sources.findIndex((s) => s.name === updatedSource.name);

		if (index >= 0) {
			sources[index] = { ...sources[index], ...updatedSource };
		} else {
			sources.push(updatedSource as Source);
		}

		await saveSources(sources);
		log(`✏️ Updated source: ${updatedSource.name}`);

		return res.status(200).json({
			success: true,
			message: `Source '${updatedSource.name}' updated successfully`,
			source: updatedSource,
		});
	} catch (err) {
		const msg = (err as Error).message || "Unknown error updating source";
		log(`❌ Error updating source: ${msg}`, "error");
		return handleError(res, msg, 500, "error");
	}
}

/**
 * GET /articles/fetch
 * Triggers fetching articles from all enabled sources (bulk)
 */
export async function fetchArticlesHandler(req: Request, res: Response) {
	try {
		log(
			`[DEBUG] fetchArticlesHandler called with query: ${JSON.stringify(req.query)}`,
		);

		const { language = "en", skipTranslation = "true" } = req.query as Record<
			string,
			string
		>;

		log(
			`🔄 Fetching articles (language: ${language}, skipTranslation: ${skipTranslation})`,
		);

		// Start async pipeline for all enabled sources
		(async () => {
			try {
				const sources = await getMergedSources();
				const enabledSources = sources.filter((s) => s.enabled);
				log(
					`[DEBUG] Found ${enabledSources.length} enabled sources for bulk fetch.`,
				);

				for (const source of enabledSources) {
					try {
						broadcast({
							type: "source:fetch:start",
							payload: {
								source: source.name,
								message: `Starting fetch for ${source.name}`,
							},
						});

						const rawData = await fetchRawSourceData(source);
						const articles = await parseAndNormalizeSource(
							rawData,
							source,
							language,
							skipTranslation === "true",
						);

						for (let i = 0; i < articles.length; i++) {
							broadcast({
								type: "source:fetch:progress",
								payload: {
									source: source.name,
									index: i + 1,
									total: articles.length,
									articleId: articles[i].id,
								},
							});
						}

						broadcast({
							type: "source:fetch:done",
							payload: {
								source: source.name,
								count: articles.length,
								message: `Fetch completed for ${source.name}`,
							},
						});
					} catch (err: any) {
						broadcast({
							type: "source:fetch:error",
							payload: { source: source.name, message: err.message },
						});
						log(
							`Error fetching articles for source ${source.name}: ${err.message}`,
							"error",
						);
					}
				}
			} catch (err: any) {
				log(`Error in bulk fetch pipeline: ${err.message}`, "error");
			}
		})();

		// Return job metadata immediately
		return res.status(200).json({
			success: true,
			message: "Bulk fetch job queued",
			jobId: crypto.randomUUID(),
			params: { language, skipTranslation: skipTranslation === "true" },
			status: "queued",
			estimatedTime: "5-10 minutes",
		});
	} catch (err) {
		const msg = (err as Error).message || "Unknown error fetching articles";
		log(`❌ Error fetching articles: ${msg}`, "error");
		return handleError(res, msg, 500, "error");
	}
}

/**
 * GET /articles/fetch/:source
 * Fetches articles from a single source
 * Fully integrates fetch pipeline with broadcasting events
 */
/**
 * GET /articles/fetch/:source
 * Fetches articles from a single source using the unified pipeline
 */
export async function fetchSingleSourceHandler(req: Request, res: Response) {
	try {
		log(
			`[DEBUG] fetchSingleSourceHandler called with params: ${JSON.stringify(
				req.params,
			)} and query: ${JSON.stringify(req.query)}`,
		);

		const { source: sourceName } = req.params;
		const { language = "en", skipTranslation = "true" } = req.query as Record<
			string,
			string
		>;

		if (!sourceName) {
			return handleError(res, "Source name is required", 400, "warn");
		}

		const sources = await getMergedSources();
		const source = sources.find((s) => s.name === sourceName);

		if (!source) {
			return handleError(res, `Source '${sourceName}' not found`, 404, "warn");
		}

		const skip = skipTranslation === "true";
		const jobId = crypto.randomUUID();

		// Run full pipeline asynchronously
		(async () => {
			try {
				await fetchArticlesForSingleSource(source, language, skip);
			} catch (err: any) {
				broadcast({
					type: "source:fetch:error",
					payload: { source: source.name, message: err.message },
				});

				log(
					`❌ Error in fetchArticlesForSingleSource: ${err.message}`,
					"error",
				);
			}
		})();

		// Respond immediately
		return res.status(200).json({
			success: true,
			message: `Fetch job queued for source '${source.name}'`,
			jobId,
			source: source.name,
			params: { language, skipTranslation: skip },
			status: "queued",
		});
	} catch (err) {
		const msg =
			(err as Error).message || "Unknown error fetching single source";

		log(`❌ Error fetching single source: ${msg}`, "error");
		return handleError(res, msg, 500, "error");
	}
}

/**
 * Register source routes in an Express app
 */
export function registerSourceRoutes(app: Express) {
	app.get("/sources", (req, res) => getSourcesHandler(req, res));
	app.post("/sources/update", (req, res) => updateSourceHandler(req, res));
	app.get("/articles/fetch", (req, res) => fetchArticlesHandler(req, res));
	app.get("/articles/fetch/:source", (req, res) =>
		fetchSingleSourceHandler(req, res),
	);
}
