/**
 * @file route-articles.ts
 * @description
 * Express routes for fetching articles from the local cache (OrbitDB / Helia) or IPFS.
 * Supports query parameters `cid`, `id`, and `url` for locating articles.
 */

import type { Express, NextFunction, Request, Response } from "express";
import { log } from "@/lib/log.server";
import type { Article } from "@/types";
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
 * GET /api/article
 *
 * Fetch a single article using query parameters:
 * - `cid`: IPFS content identifier
 * - `id`: Internal DB ID
 * - `url`: Original URL of the article
 *
 * Priority: CID → ID → URL
 */
export const getArticleHandler = async (
	req: Request,
	res: Response,
	handlers?: {
		getLocalArticle?: (idOrCid: string) => Promise<Article | null>;
		addDebugLog?: (entry: any) => Promise<void>;
	},
) => {
	const { getLocalArticle, addDebugLog } = handlers || {};

	if (!getLocalArticle) {
		return handleError(res, "getLocalArticle function not provided", 500, "error");
	}

	try {
		const { cid, id, url } = req.query as Record<string, string>;

		let article: Article | null = null;

		if (cid) article = await getLocalArticle(cid);
		else if (id) article = await getLocalArticle(id);
		else if (url) article = await getLocalArticle(url);

		if (!article) {
			return handleError(res, "Article not found", 404, "warn");
		}

		if (addDebugLog) {
			await addDebugLog({
				_id: crypto.randomUUID(),
				timestamp: new Date().toISOString(),
				message: `Fetched article for query: ${JSON.stringify(req.query)}`,
				level: "info",
			});
		}

		res.status(200).json(article);
	} catch (err) {
		const msg = (err as Error).message || "Unknown error fetching article";
		if (addDebugLog) {
			await addDebugLog({
				_id: crypto.randomUUID(),
				timestamp: new Date().toISOString(),
				message: `Error fetching article: ${msg}`,
				level: "error",
			});
		}
		return handleError(res, msg, 500, "error");
	}
};

/**
 * Helper: register all article routes in an Express app
 */
export function registerArticleRoutes(app: Express, handlers: any = {}) {
	app.get("/api/article", throttleMiddleware, (req, res) => getArticleHandler(req, res, handlers));
}
