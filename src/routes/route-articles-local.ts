import type { Express, NextFunction, Request, Response } from "express";
import type { ArticleAnalyzedDB } from "@/db-articles-analyzed";
import type { ArticleLocalDB } from "@/db-articles-local";
import type { BaseServerContext } from "@/httpServer";
import { analyzeArticle } from "@/lib/ai";
import { translateMultipleTitlesAI } from "@/lib/ai/translate.server";
import { addDebugLog, log } from "@/lib/log.server";
import type { ApiResponse, Article, ArticleAnalyzed, Source } from "@/types";
import { handleError } from "./helpers";

/**
 * Combined handlers for local article routes.
 * Extends the DB interface to optionally include Helia instance.
 */
export type LocalArticleHandlers = ArticleLocalDB &
	BaseServerContext & {
		saveAnalyzedArticle: ArticleAnalyzedDB["saveAnalyzedArticle"];
	};

/**
 * Simple in-memory throttle map to limit requests per IP
 */
const throttleMap = new Map<string, { count: number; lastRequest: number }>();
const THROTTLE_LIMIT = 15; // max requests per TIME_WINDOW
const TIME_WINDOW = 1000 * 5; // 5 seconds

/**
 * Express middleware to throttle requests per IP
 */
export const throttleMiddleware = (req: Request, res: Response, next: NextFunction) => {
	const clientIP = req.ip || req.socket.remoteAddress || "unknown";
	const now = Date.now();
	const throttle = throttleMap.get(clientIP) || { count: 0, lastRequest: now };

	if (now - throttle.lastRequest > TIME_WINDOW) throttle.count = 0;
	throttle.count++;
	throttle.lastRequest = now;
	throttleMap.set(clientIP, throttle);

	if (throttle.count > THROTTLE_LIMIT) {
		res.status(429).json({ error: "Too many requests — please slow down." });
		return;
	}

	next();
};

/**
 * POST /articles/local/translate
 *
 * Handler to translate specified fields of local articles to a target language.
 *
 * @param req - Express request
 *   - `req.body.urls`: string[] of article URLs or IDs to translate
 *   - `req.body.targetLanguage`: target language code (e.g., "en", "ko")
 *   - `req.body.keys`: optional array of Article keys to translate (default ["title"])
 *   - `req.body.overwrite`: optional boolean, whether to overwrite existing translations
 *   - `req.query.overwrite`: optional query param to override overwrite flag
 * @param handlers - Functions to get and save local articles:
 *   - `getLocalArticle(urlOrId: string): Promise<Article | null>` - fetches a local article
 *   - `saveLocalArticle(article: Article, overwrite?: boolean): Promise<void>` - saves updated article
 * @returns Promise resolving to an `ApiResponse<Article[]>` containing updated articles
 */
export const translateArticleHandler = async (
	req: Request,
	res: Response,
	handlers: LocalArticleHandlers,
): Promise<void> => {
	// <- note we no longer return ApiResponse, we handle response inside
	const { helia, getLocalArticle, saveLocalArticle } = handlers;

	if (!getLocalArticle || !saveLocalArticle) {
		await handleError(res, "Required DB functions not provided", 500, "error");
		return;
	}

	const { identifiers, targetLanguage, keys = ["title"], overwrite: bodyOverwrite } = req.body;
	const queryOverwrite = req.query?.overwrite === "true";
	const overwrite = queryOverwrite || bodyOverwrite === true;

	if (!Array.isArray(identifiers) || !targetLanguage || !Array.isArray(keys) || keys.length === 0) {
		await handleError(res, "Missing ID, targetLanguage, or keys", 404, "error");
		return;
	}

	const updatedArticles: Article[] = [];

	for (const id of identifiers) {
		try {
			const article = await getLocalArticle(id);
			if (!article) continue;

			for (const key of keys) {
				const originalText = article[key as keyof Article] as unknown;
				if (typeof originalText !== "string") continue;

				const translated = await translateMultipleTitlesAI([originalText], targetLanguage);

				const translatedText = translated?.[0];
				if (translatedText) {
					(article as any)[key] = translatedText;
				}
			}

			await saveLocalArticle(article, helia, overwrite);
			updatedArticles.push(article);
		} catch (err) {
			console.error(`Failed to translate article ${id}:`, err);
			await handleError(
				res,
				`Failed to translate article ${id}: ${(err as Error).message}`,
				500,
				"error",
			);
			return;
		}
	}

	res.json({ success: true, data: updatedArticles });
};

/**
 * POST /articles/local/fetch
 *
 * Starts a background fetch of articles.
 */
export const fetchLocalArticlesHandler = async (
	req: Request,
	res: Response,
	handlers: LocalArticleHandlers,
) => {
	const { fetchAllLocalSources, addUniqueLocalArticles } = handlers;

	if (!fetchAllLocalSources || !addUniqueLocalArticles) {
		await handleError(res, "Required DB functions not provided", 500, "error");
		return;
	}

	const sources: Source[] = Array.isArray(req.body?.sources) ? req.body.sources : [];
	const since = req.body?.since ? new Date(req.body.since) : undefined;

	// Fire-and-forget background fetch
	(async () => {
		try {
			const { articles, errors } = await fetchAllLocalSources(sources, "en", since);

			const addedCount = await addUniqueLocalArticles(articles);

			if (errors && addDebugLog) {
				log(`fetchAllSources errors: ${JSON.stringify(errors)}`, "error");
				await addDebugLog({
					message: "fetchAllSources encountered errors",
					level: "error",
					meta: { errors },
				});
			}

			if (addDebugLog) {
				await addDebugLog({
					message: `Background fetch completed: ${addedCount} new articles`,
					level: "info",
					meta: { sources: sources.map((s) => s.name) ?? 0 },
				});
			}
		} catch (err) {
			const message = (err as Error).message || "Unknown error fetching articles";
			log(`Background fetch error: ${message}`, "error");

			if (addDebugLog) {
				await addDebugLog({
					message: `Background fetch failed: ${message}`,
					level: "error",
				});
			}
		}
	})();

	res.json({ success: true, message: "Article fetch started" });
};

/**
 * GET /api/article/aggregated/:id
 * Fetch aggregated article with full analysis
 */
// export const getAggregatedArticleHandler = async (
// 	req: Request,
// 	res: Response,
// 	handlers: LocalArticleHandlers,
// ) => {
// 	const { getAllLocalArticles } = handlers;

// 	res.setHeader("Content-Type", "application/json");

// 	if (!getAllLocalArticles) {
// 		return handleError(res, "getAllLocalArticles function not provided", 500, "error");
// 	}

// 	try {
// 		const storyId = req.params.id;
// 		if (!storyId) {
// 			return handleError(res, "No story ID provided", 400, "warn");
// 		}

// 		const allArticles = await getAllLocalArticles();

// 		// Aggregate articles for the same story
// 		const related = allArticles.filter((a) => a.storyId === storyId);

// 		if (related.length === 0) {
// 			return handleError(res, `No articles found for story: ${storyId}`, 404, "warn");
// 		}

// 		// Combine content
// 		const combinedContent = related
// 			.map((a) => a.content)
// 			.filter(Boolean)
// 			.join("\n\n");

// 		// TODO: Run analysis (political bias, cognitive bias, summary, bullet points)
// 		const analyzed = await analyzeContent(combinedContent, related);

// 		res.json(analyzed);
// 	} catch (err) {
// 		return handleError(
// 			res,
// 			`Error fetching aggregated article: ${(err as Error).message}`,
// 			500,
// 			"error",
// 		);
// 	}
// };

/**
 * GET /articles/local
 * Returns all articles from the local article DB, throttled per IP
 */
export const getAllLocalArticlesHandler = async (
	req: Request,
	res: Response,
	handlers: LocalArticleHandlers,
) => {
	const { getAllLocalArticles } = handlers;

	if (!getAllLocalArticles) {
		await handleError(res, "getAllLocalArticles function not provided", 500, "error");
		return;
	}

	try {
		const allArticles = await getAllLocalArticles();

		if (addDebugLog) {
			await addDebugLog({
				message: `Fetched ${allArticles.length} articles for ${req.ip?.toString()}`,
				level: "info",
			});
		}

		res.json(allArticles);
	} catch (err) {
		const message = (err as Error).message || "Unknown error fetching articles";
		await handleError(res, `Error fetching articles for ${req.ip}: ${message}`, 500, "error");
	}
};

/**
 * GET /articles/local/full
 * Fetch a single local article by ID, CID, or URL
 */
export const getFullLocalArticleHandler = async (
	req: Request,
	res: Response,
	handlers: LocalArticleHandlers,
) => {
	const { saveAnalyzedArticle, getLocalArticle, getFullLocalArticle, helia } = handlers;

	if (!getLocalArticle) return handleError(res, "getLocalArticle not provided", 500, "error");
	if (!getFullLocalArticle)
		return handleError(res, "getFullLocalArticle not provided", 500, "error");
	if (!helia) return handleError(res, "Helia node not provided", 500, "error");

	try {
		const lookupKey = req.query.id || req.query.cid || req.query.url;
		if (!lookupKey) return handleError(res, "No article ID, CID, or URL provided", 400, "warn");

		const article = await getLocalArticle(lookupKey as string);
		if (!article) return handleError(res, `Article not found for ${lookupKey}`, 404, "warn");

		const fullArticle = await getFullLocalArticle(article, helia);

		let analyzedArticle: ArticleAnalyzed | null = null;
		if (!fullArticle.analyzed && analyzeArticle) {
			analyzedArticle = await analyzeArticle(fullArticle);
		}

		console.log("analyzedArticle", analyzedArticle);

		// assign new ID and reference to original
		analyzedArticle = {
			...analyzedArticle,
			id: crypto.randomUUID(),
			originalId: fullArticle.id,
			url: fullArticle.url,
			title: fullArticle.title,
			analyzed: true,
		};

		await saveAnalyzedArticle(analyzedArticle);

		res.json(analyzedArticle);
	} catch (err) {
		const message = (err as Error).message;
		await handleError(res, `Error fetching article: ${message}`, 500, "error");
	}
};

/**
 * POST /articles/local/save
 * Save a single new source article, optionally overwriting existing
 */
export const saveLocalArticleHandler = async (
	req: Request,
	res: Response,
	handlers: LocalArticleHandlers,
) => {
	const { helia, saveLocalArticle } = handlers;

	if (!saveLocalArticle) return handleError(res, "saveLocalArticle not provided", 500, "error");
	if (!req.body || !req.body.url || !req.body.title || !req.body.content) {
		return handleError(res, "Missing required article fields", 400, "warn");
	}

	// Read overwrite flag from query param or request body
	const overwrite = req.query.overwrite === "true" || req.body.overwrite === true;

	try {
		await saveLocalArticle(req.body, helia, overwrite);
		await addDebugLog({ message: `Saved article: ${req.body.url}`, level: "info" });
		res.json({ success: true, url: req.body.url, overwritten: overwrite });
	} catch (err) {
		const message = (err as Error).message;
		await handleError(res, `Error saving article: ${message}`, 500, "error");
	}
};

/**
 * POST /articles/local/refetch
 * Add multiple articles, skipping duplicates
 */
export const refetchLocalArticlesHandler = async (
	req: Request,
	res: Response,
	handlers: LocalArticleHandlers,
) => {
	const { addUniqueLocalArticles } = handlers;

	if (!addUniqueLocalArticles)
		return handleError(res, "addUniqueLocalArticles not provided", 500, "error");
	if (!req.body || !Array.isArray(req.body))
		return handleError(res, "Expected an array of articles", 400, "warn");

	try {
		const addedCount = await addUniqueLocalArticles(req.body);
		await addDebugLog({ message: `Refetched ${addedCount} unique articles`, level: "info" });
		res.json({ success: true, added: addedCount });
	} catch (err) {
		const message = (err as Error).message;
		await handleError(res, `Error refetching articles: ${message}`, 500, "error");
	}
};

/**
 * DELETE /articles/local/delete/:url
 * Delete a source article by URL
 */
export const deleteLocalArticleHandler = async (
	req: Request,
	res: Response,
	handlers: LocalArticleHandlers,
) => {
	const { deleteLocalArticle } = handlers;

	if (!deleteLocalArticle) return handleError(res, "deleteLocalArticle not provided", 500, "error");

	try {
		const articleUrl = decodeURIComponent(req.params.url);
		if (!articleUrl) return handleError(res, "No article URL provided", 400, "warn");

		await deleteLocalArticle(articleUrl);
		await addDebugLog({ message: `Deleted article: ${articleUrl}`, level: "info" });
		res.json({ success: true, url: articleUrl });
	} catch (err) {
		const message = (err as Error).message;
		await handleError(res, `Error deleting article: ${message}`, 500, "error");
	}
};

/**
 * Helper: register all local article routes in an Express app
 */
export function registerLocalArticleRoutes(app: Express, handlers: any) {
	app.post("/articles/local/fetch", (req, res) => fetchLocalArticlesHandler(req, res, handlers));
	app.get("/articles/local", throttleMiddleware, (req, res) =>
		getAllLocalArticlesHandler(req, res, handlers),
	);
	app.post("/articles/local/translate", (req, res) => {
		translateArticleHandler(req, res, handlers);
	});
	app.get("/articles/local/full", (req, res) => getFullLocalArticleHandler(req, res, handlers));
	app.post("/articles/local/save", (req, res) => saveLocalArticleHandler(req, res, handlers));
	app.post("/articles/local/refetch", (req, res) =>
		refetchLocalArticlesHandler(req, res, handlers),
	);
	app.delete("/articles/local/delete/:url", (req, res) =>
		deleteLocalArticleHandler(req, res, handlers),
	);
}
