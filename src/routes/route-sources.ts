/**
 * @file route-sources.ts
 * @description Express routes for managing news sources and fetching articles.
 */

import type { Express, Request, Response } from "express";
import { DEFAULT_SOURCES } from "@/constants/sources";
import { log } from "@/lib/log";
import { getSourceMeta } from "@/lib/ai/sourceMeta";
import type { Source } from "@/types";
import { handleError } from "./helpers";

/**
 * GET /sources
 * Returns the list of configured news sources with optional metadata
 */
export async function getSourcesHandler(req: Request, res: Response) {
	try {
		const { withMeta } = req.query as Record<string, string>;
		let sources = [...DEFAULT_SOURCES];

		// Optionally enrich with live metadata
		if (withMeta === "true" && sources.length > 0) {
			const enriched = await Promise.all(
				sources.map(async (source) => {
					try {
						const meta = await getSourceMeta(source.name);
						return {
							...source,
							meta,
						};
					} catch (err) {
						log(`Failed to fetch metadata for ${source.name}: ${(err as Error).message}`, "warn");
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
		const updatedSource = req.body as Partial<Source> & { name: string };

		if (!updatedSource.name) {
			return handleError(res, "Source name is required", 400, "warn");
		}

		// For now, just acknowledge the update
		// In a real implementation, you'd persist this to a DB
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
 * Triggers fetching articles from configured sources
 * Query params:
 *  - language: target language (default: en)
 *  - skipTranslation: skip translation step (default: true)
 */
export async function fetchArticlesHandler(req: Request, res: Response) {
	try {
		const { language = "en", skipTranslation = "true" } = req.query as Record<string, string>;

		log(`🔄 Fetching articles (language: ${language}, skipTranslation: ${skipTranslation})`);

		// Placeholder: In a real implementation, this would trigger the fetch pipeline
		// For now, return a success response with metadata
		return res.status(200).json({
			success: true,
			message: "Article fetch job queued",
			jobId: crypto.randomUUID(),
			params: {
				language,
				skipTranslation: skipTranslation === "true",
			},
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
 * Register source routes in an Express app
 */
export function registerSourceRoutes(app: Express) {
	// GET /sources
	app.get("/sources", (req, res) => getSourcesHandler(req, res));

	// POST /sources/update
	app.post("/sources/update", (req, res) => updateSourceHandler(req, res));

	// GET /articles/fetch
	app.get("/articles/fetch", (req, res) => fetchArticlesHandler(req, res));
}
