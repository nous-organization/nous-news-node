/**
 * @file route-articles.ts
 * @description
 * Express routes for fetching articles from the local cache (OrbitDB / Helia) or IPFS.
 * Supports query parameters `cid`, `id`, and `url` for locating articles.
 */

import type { Express, NextFunction, Request, Response } from "express";
import { addDebugLog } from "@/lib/log";
import {
	getByIdentifier,
	getFullArticle,
} from "@/p2p/orbitdb/stores/articles/local";
import { handleError } from "./helpers";

/**
 * Simple in-memory throttle map to limit requests per IP
 */
const throttleMap = new Map<string, { count: number; lastRequest: number }>();
const THROTTLE_LIMIT = 15; // max requests per TIME_WINDOW
const TIME_WINDOW = 1000 * 5; // 5 seconds

/**
 * Middleware to throttle requests per IP
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
 * GET /api/article
 *
 * Fetch a single article using query parameters:
 * - `cid`: IPFS content identifier
 * - `id`: Internal DB ID
 * - `url`: Original URL of the article
 *
 * Priority: CID → ID → URL
 */
export const getArticleHandler = async (req: Request, res: Response) => {
	try {
		const { cid, id, url } = req.query as Record<string, string>;
		const identifier = cid || id || url;

		if (!identifier) {
			return handleError(
				res,
				"Missing query parameter (cid, id, or url)",
				400,
				"warn",
			);
		}

		// Fetch article from local OrbitDB
		const article = await getByIdentifier(identifier);
		if (!article) {
			return handleError(res, "Article not found", 404, "warn");
		}

		// Ensure full content is loaded
		const fullArticle = await getFullArticle(article);

		// Log debug info
		await addDebugLog({
			message: `Fetched article for query: ${JSON.stringify(req.query)}`,
			level: "info",
			meta: { query: req.query },
		});

		res.status(200).json(fullArticle);
	} catch (err) {
		const msg = (err as Error).message || "Unknown error fetching article";
		await addDebugLog({
			message: `Error fetching article: ${msg}`,
			level: "error",
			meta: { query: req.query },
		});
		return handleError(res, msg, 500, "error");
	}
};

/**
 * Helper: register all article routes in an Express app
 *
 * @param app Express application instance
 */
export function registerArticleRoutes(app: Express) {
	app.get("/api/article", throttleMiddleware, getArticleHandler);
}
