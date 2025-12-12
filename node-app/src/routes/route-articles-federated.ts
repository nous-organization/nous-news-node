/**
 * @file route-article-federated.ts
 * @description Express routes for fetching and managing federated article pointers.
 * Supports basic throttling and uses external OrbitDB/P2P methods directly.
 */

import type { Express, NextFunction, Request, Response } from "express";
import { getAll as getAllFederatedArticles } from "@/p2p/orbitdb/stores/articles/federated";
import type { ArticleFederated } from "@/types";
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
 * GET /articles/federated
 *
 * Fetch all federated articles from the P2P node.
 */
export const fetchFederatedArticlesHandler = async (
	req: Request,
	res: Response,
) => {
	try {
		const articles: ArticleFederated[] = await getAllFederatedArticles();
		res.status(200).json(articles);
	} catch (err) {
		await handleError(
			res,
			(err as Error).message || "Unknown error fetching federated articles",
			500,
			"error",
		);
	}
};

/**
 * Helper: register federated article routes in an Express app
 */
export function registerFederatedArticleRoutes(app: Express) {
	app.get(
		"/articles/federated",
		throttleMiddleware,
		fetchFederatedArticlesHandler,
	);
}
