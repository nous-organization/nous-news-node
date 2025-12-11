/**
 * @file route-sources.ts
 * @description Express routes for managing news sources and fetching articles.
 */

import type { Express, Request, Response } from "express";
import { DEFAULT_SOURCES } from "@/constants/sources";
import { getSourceMeta } from "@/lib/ai/sourceMeta";
import { log } from "@/lib/log";
import {
	fetchArticlesForSource,
	getMergedSources,
	loadSources,
	saveSources,
} from "@/lib/sources";
import type { Source } from "@/types";
import { handleError } from "./helpers";

/**
 * GET /sources
 * Returns the list of configured news sources with optional metadata
 */
export async function getSourcesHandler(req: Request, res: Response) {
	try {
		const { withMeta } = req.query as Record<string, string>;
		let sources = await getMergedSources(DEFAULT_SOURCES);

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
		if (!updatedSource.name)
			return handleError(res, "Source name is required", 400, "warn");

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
		const { language = "en", skipTranslation = "true" } = req.query as Record<
			string,
			string
		>;
		const skip = skipTranslation === "true";

		log(`🔄 Bulk fetch: language=${language}, skipTranslation=${skip}`);

		const jobId = crypto.randomUUID();

		// Run async bulk fetch
		(async () => {
			try {
				const sources = await getMergedSources(DEFAULT_SOURCES);
				const enabledSources = sources.filter((s) => s.enabled);

				for (const source of enabledSources) {
					try {
						await fetchArticlesForSource(source, language, skip);
					} catch (err) {
						log(
							`Error fetching source ${source.name}: ${(err as Error).message}`,
							"error",
						);
					}
				}
			} catch (err) {
				log(`Error in bulk fetch pipeline: ${(err as Error).message}`, "error");
			}
		})();

		res.status(200).json({
			success: true,
			message: "Bulk fetch job queued",
			jobId,
			params: { language, skipTranslation: skip },
			status: "queued",
		});
	} catch (err) {
		const msg = (err as Error).message || "Unknown error fetching articles";
		log(`❌ Error fetching articles: ${msg}`, "error");
		return handleError(res, msg, 500, "error");
	}
}

/**
 * GET /articles/fetch/:source
 * Fetch articles from a single source asynchronously
 */
export async function fetchSingleSourceHandler(req: Request, res: Response) {
	try {
		const { source: sourceName } = req.params;
		const { language = "en", skipTranslation = "true" } = req.query as Record<
			string,
			string
		>;
		const skip = skipTranslation === "true";

		if (!sourceName)
			return handleError(res, "Source name is required", 400, "warn");

		const sources = await getMergedSources(DEFAULT_SOURCES);
		const source = sources.find((s) => s.name === sourceName);
		if (!source)
			return handleError(res, `Source '${sourceName}' not found`, 404, "warn");

		const jobId = crypto.randomUUID();

		// Fire-and-forget fetch
		(async () => {
			try {
				await fetchArticlesForSource(source, language, skip);
			} catch (err) {
				log(
					`Error fetching source ${source.name}: ${(err as Error).message}`,
					"error",
				);
			}
		})();

		res.status(200).json({
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
	app.get("/sources", getSourcesHandler);
	app.post("/sources/update", updateSourceHandler);
	app.get("/articles/fetch", fetchArticlesHandler);
	app.get("/articles/fetch/:source", fetchSingleSourceHandler);
}
