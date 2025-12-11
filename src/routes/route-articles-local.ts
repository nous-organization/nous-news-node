/**
 * @file route-local-articles.ts
 * @description
 * Express routes for managing local articles in OrbitDB / Helia.
 * Supports fetching, saving, translating, refetching, and deleting articles.
 */

import type { Express, NextFunction, Request, Response } from "express";
import { analyzeArticle } from "@/lib/ai";
import { translateMultipleTitlesAI } from "@/lib/ai/translate";
import { addDebugLog, log } from "@/lib/log";
import {
	add as addArticle,
	addUnique as addUniqueLocalArticles,
	deleteByUrl,
	fetchAllLocalSources,
	getAll as getAllLocalArticles,
	getByIdentifier,
	getFullArticle,
} from "@/p2p/orbitdb/stores/articles/local";
import type { Article, ArticleAnalyzed, Source } from "@/types";
import { handleError } from "./helpers";

/**
 * Simple in-memory throttle map to limit requests per IP
 */
const throttleMap = new Map<string, { count: number; lastRequest: number }>();
const THROTTLE_LIMIT = 15; // max requests per TIME_WINDOW
const TIME_WINDOW = 1000 * 5; // 5 seconds

/**
 * Express middleware to throttle requests per IP
 */
export const throttleMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
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
 * Translate specified fields of local articles to a target language
 */
export const translateArticleHandler = async (req: Request, res: Response) => {
	const {
		identifiers,
		targetLanguage,
		keys = ["title"],
		overwrite: bodyOverwrite,
	} = req.body;
	const queryOverwrite = req.query?.overwrite === "true";
	const overwrite = queryOverwrite || bodyOverwrite === true;

	if (!Array.isArray(identifiers) || !targetLanguage || keys.length === 0) {
		return handleError(
			res,
			"Missing identifiers, targetLanguage, or keys",
			400,
			"error",
		);
	}

	const updatedArticles: Article[] = [];

	for (const id of identifiers) {
		try {
			const article = await getByIdentifier(id);
			if (!article) continue;

			for (const key of keys) {
				const originalText = article[key as keyof Article] as unknown;
				if (typeof originalText !== "string") continue;

				const translated = await translateMultipleTitlesAI(
					[originalText],
					targetLanguage,
				);
				if (translated?.[0]) (article as any)[key] = translated[0];
			}

			await addArticle(article, overwrite);
			updatedArticles.push(article);
		} catch (err) {
			await handleError(
				res,
				`Failed to translate article ${id}: ${(err as Error).message}`,
				500,
				"error",
			);
			return;
		}
	}

	await addDebugLog({
		message: `Translated ${updatedArticles.length} articles`,
		level: "info",
		meta: { identifiers, targetLanguage },
	});

	res.json({ success: true, data: updatedArticles });
};

/**
 * POST /articles/local/fetch
 * Starts a background fetch of articles from sources
 */
export const fetchLocalArticlesHandler = async (
	req: Request,
	res: Response,
) => {
	const sources: Source[] = Array.isArray(req.body?.sources)
		? req.body.sources
		: [];
	const since = req.body?.since ? new Date(req.body.since) : undefined;

	// Fire-and-forget
	(async () => {
		try {
			const { articles, errors } = await fetchAllLocalSources(
				sources,
				"en",
				since,
			);
			const addedCount = await addUniqueLocalArticles(articles);

			if (errors) {
				log(`fetchAllSources errors: ${JSON.stringify(errors)}`, "error");
				await addDebugLog({
					message: "fetchAllSources encountered errors",
					level: "error",
					meta: { errors },
				});
			}

			await addDebugLog({
				message: `Background fetch completed: ${addedCount} new articles`,
				level: "info",
				meta: { sources: sources.map((s) => s.name) ?? [] },
			});
		} catch (err) {
			const message =
				(err as Error).message || "Unknown error fetching articles";
			log(`Background fetch error: ${message}`, "error");
			await addDebugLog({
				message: `Background fetch failed: ${message}`,
				level: "error",
			});
		}
	})();

	res.json({ success: true, message: "Article fetch started" });
};

/**
 * GET /articles/local
 * Returns all local articles
 */
export const getAllLocalArticlesHandler = async (
	req: Request,
	res: Response,
) => {
	try {
		const articles = await getAllLocalArticles();

		await addDebugLog({
			message: `Fetched ${articles.length} articles for ${req.ip?.toString()}`,
			level: "info",
		});

		res.json(articles);
	} catch (err) {
		const message = (err as Error).message || "Unknown error fetching articles";
		await handleError(res, `Error fetching articles: ${message}`, 500, "error");
	}
};

/**
 * GET /articles/local/full
 * Fetch a single local article with full content and analysis
 */
export const getFullLocalArticleHandler = async (
	req: Request,
	res: Response,
) => {
	try {
		const lookupKey = req.query.id || req.query.cid || req.query.url;
		if (!lookupKey)
			return handleError(
				res,
				"No article ID, CID, or URL provided",
				400,
				"warn",
			);

		const article = await getByIdentifier(lookupKey as string);
		if (!article)
			return handleError(
				res,
				`Article not found for ${lookupKey}`,
				404,
				"warn",
			);

		const fullArticle = await getFullArticle(article);

		let analyzedArticle: ArticleAnalyzed | null = null;
		if (!fullArticle.analyzed && analyzeArticle) {
			analyzedArticle = await analyzeArticle(fullArticle);
			analyzedArticle = {
				...analyzedArticle,
				id: crypto.randomUUID(),
				originalId: fullArticle.id,
				url: fullArticle.url,
				title: fullArticle.title,
				analyzed: true,
			};
		}

		res.json(analyzedArticle ?? fullArticle);
	} catch (err) {
		const message = (err as Error).message;
		await handleError(res, `Error fetching article: ${message}`, 500, "error");
	}
};

/**
 * POST /articles/local/save
 * Save a single article
 */
export const saveLocalArticleHandler = async (req: Request, res: Response) => {
	if (!req.body || !req.body.url || !req.body.title || !req.body.content) {
		return handleError(res, "Missing required article fields", 400, "warn");
	}

	const overwrite =
		req.query.overwrite === "true" || req.body.overwrite === true;

	try {
		await addArticle(req.body, overwrite);
		await addDebugLog({
			message: `Saved article: ${req.body.url}`,
			level: "info",
		});
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
) => {
	if (!Array.isArray(req.body))
		return handleError(res, "Expected an array of articles", 400, "warn");

	try {
		const addedCount = await addUniqueLocalArticles(req.body);
		await addDebugLog({
			message: `Refetched ${addedCount} unique articles`,
			level: "info",
		});
		res.json({ success: true, added: addedCount });
	} catch (err) {
		const message = (err as Error).message;
		await handleError(
			res,
			`Error refetching articles: ${message}`,
			500,
			"error",
		);
	}
};

/**
 * DELETE /articles/local/delete/:url
 * Delete a source article by URL
 */
export const deleteLocalArticleHandler = async (
	req: Request,
	res: Response,
) => {
	const articleUrl = decodeURIComponent(req.params.url);
	if (!articleUrl)
		return handleError(res, "No article URL provided", 400, "warn");

	try {
		await deleteByUrl(articleUrl);
		await addDebugLog({
			message: `Deleted article: ${articleUrl}`,
			level: "info",
		});
		res.json({ success: true, url: articleUrl });
	} catch (err) {
		const message = (err as Error).message;
		await handleError(res, `Error deleting article: ${message}`, 500, "error");
	}
};

/**
 * Helper: register all local article routes
 */
export function registerLocalArticleRoutes(app: Express) {
	app.post("/articles/local/fetch", fetchLocalArticlesHandler);
	app.get("/articles/local", throttleMiddleware, getAllLocalArticlesHandler);
	app.post("/articles/local/translate", translateArticleHandler);
	app.get("/articles/local/full", getFullLocalArticleHandler);
	app.post("/articles/local/save", saveLocalArticleHandler);
	app.post("/articles/local/refetch", refetchLocalArticlesHandler);
	app.delete("/articles/local/delete/:url", deleteLocalArticleHandler);
}
