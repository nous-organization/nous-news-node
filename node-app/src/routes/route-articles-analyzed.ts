/**
 * @file route-articles-analyzed.ts
 * @description Express routes for managing fully analyzed articles.
 * Routes now use external OrbitDB store methods directly.
 */

import type { Express, Request, Response } from "express";
import { analyzeArticle } from "@/lib/ai";
import { addDebugLog, log } from "@/lib/log";
import { getHelia } from "@/p2p/helia";
import {
	deleteById,
	getAll,
	getById,
	add as saveAnalyzedArticleStore,
} from "@/p2p/orbitdb/stores/articles/analyzed";
import { getFullArticle } from "@/p2p/orbitdb/stores/articles/local/getFullArticle";
import type { Article, ArticleAnalyzed } from "@/types";
import { handleError } from "./helpers";

/**
 * Simple in-memory throttle map to limit requests per IP
 */
const throttleMap = new Map<string, { count: number; lastRequest: number }>();
const THROTTLE_LIMIT = 15;
const TIME_WINDOW = 1000 * 5;

/**
 * Middleware to throttle requests per IP
 */
export const throttleMiddleware = (
	req: Request,
	res: Response,
	next: () => void,
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
 * GET /articles/analyzed/full
 * Retrieves a fully analyzed article by ID, URL, or IPFS CID.
 */
export const getFullAnalyzedArticleHandler = async (
	req: Request,
	res: Response,
) => {
	const helia = getHelia();
	if (!helia) return handleError(res, "Helia node not provided", 500, "error");

	try {
		const lookupKey = req.query.id || req.query.cid || req.query.url;
		if (!lookupKey)
			return handleError(
				res,
				"No article ID, CID, or URL provided",
				400,
				"warn",
			);

		// Check if already analyzed
		const analyzedArticle: ArticleAnalyzed | null = await getById(
			lookupKey as string,
		);
		if (analyzedArticle) {
			log(`Found analyzed article: ${analyzedArticle.id}`);
			return res.json(analyzedArticle);
		}

		// Fetch local article and enrich
		const localArticle: Article | null = await getFullArticle(
			{ id: lookupKey as string } as Article,
			true,
		);

		if (!localArticle) {
			return handleError(
				res,
				`Article not found for ${lookupKey}`,
				404,
				"warn",
			);
		}

		// Analyze article if the function is available
		let analyzedResult: ArticleAnalyzed | null = null;

		if (analyzeArticle) {
			analyzedResult = await analyzeArticle(localArticle as ArticleAnalyzed);
		}

		// Use localArticle as fallback if analysis returns null
		const fullAnalyzed: ArticleAnalyzed = {
			...(analyzedResult ?? (localArticle as ArticleAnalyzed)),
			id: crypto.randomUUID(),
			originalId: localArticle.id,
			url: localArticle.url,
			title: localArticle.title,
			analyzed: true,
		};

		await saveAnalyzedArticleStore(fullAnalyzed);
		log(`Saved analyzed article: ${fullAnalyzed.id}`);
		res.json(fullAnalyzed);
	} catch (err) {
		const message = (err as Error).message;
		await handleError(
			res,
			`Error fetching analyzed article: ${message}`,
			500,
			"error",
		);
	}
};

/**
 * GET /articles/analyzed
 * Retrieves all analyzed articles
 */
export const getAllAnalyzedArticlesHandler = async (
	req: Request,
	res: Response,
) => {
	try {
		const all = await getAll();
		res.json(all);
	} catch (err) {
		const message = (err as Error).message;
		await handleError(
			res,
			`Error fetching all analyzed articles: ${message}`,
			500,
			"error",
		);
	}
};

/**
 * POST /articles/analyzed/save
 * Save or update an analyzed article
 */
export const saveAnalyzedArticleHandler = async (
	req: Request,
	res: Response,
) => {
	try {
		const article: ArticleAnalyzed = req.body;
		if (!article?.id)
			return handleError(res, "No article ID provided", 400, "warn");

		await saveAnalyzedArticleStore(article);
		res.json({ success: true, id: article.id });
	} catch (err) {
		const message = (err as Error).message;
		await handleError(
			res,
			`Error saving analyzed article: ${message}`,
			500,
			"error",
		);
	}
};

/**
 * DELETE /articles/analyzed/delete/:id
 * Delete an analyzed article by ID
 */
export const deleteAnalyzedArticleHandler = async (
	req: Request,
	res: Response,
) => {
	try {
		const { id } = req.params;
		if (!id) return handleError(res, "No article ID provided", 400, "warn");

		await deleteById(id);
		res.json({ success: true, id });
	} catch (err) {
		const message = (err as Error).message;
		await handleError(
			res,
			`Error deleting analyzed article: ${message}`,
			500,
			"error",
		);
	}
};

/**
 * Helper: register all analyzed article routes in an Express app
 */
export function registerAnalyzedArticleRoutes(app: Express) {
	app.get(
		"/articles/analyzed/full",
		throttleMiddleware,
		getFullAnalyzedArticleHandler,
	);
	app.get(
		"/articles/analyzed",
		throttleMiddleware,
		getAllAnalyzedArticlesHandler,
	);
	app.post("/articles/analyzed/save", saveAnalyzedArticleHandler);
	app.delete("/articles/analyzed/delete/:id", deleteAnalyzedArticleHandler);
}
