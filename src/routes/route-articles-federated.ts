/**
 * @file route-article-federated.ts
 * @description Express-compatible route for fetching federated article pointers.
 */

import type { Express, NextFunction, Request, Response } from "express";
import type { ArticleFederatedDB } from "@/db-articles-federated";
import type { BaseServerContext } from "@/httpServer";
import type { ArticleFederated } from "@/types";
import { handleError } from "./helpers";

/**
 * Combined handlers for federated article routes
 * Extends the DB interface and adds route-specific helpers
 */
export type FederatedArticleHandlers = ArticleFederatedDB &
	BaseServerContext & {
		// TODO: Add extra props here
	};

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
 * GET /articles/federated
 *
 * Fetch all federated articles from the P2P node.
 */
export const fetchFederatedArticlesHandler = async (
	req: Request,
	res: Response,
	handlers?: FederatedArticleHandlers,
) => {
	const { getFederatedArticles } = handlers || {};
	if (!getFederatedArticles) {
		return handleError(res, "getFederatedArticles function not provided", 500, "error");
	}

	try {
		const articles: ArticleFederated[] = await getFederatedArticles();
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
export function registerFederatedArticleRoutes(app: Express, handlers: any) {
	app.get("/articles/federated", throttleMiddleware, (req, res) =>
		fetchFederatedArticlesHandler(req, res, handlers),
	);
}
