// src/routes/route-articles-analyzed.ts
import type { Express, Request, Response } from "express";
import type { ArticleAnalyzedDB } from "@/db-articles-analyzed";
import type { BaseServerContext } from "@/httpServer";
import { addDebugLog, log } from "@/lib/log";
import type { ArticleAnalyzed } from "@/types";
import { handleError } from "./helpers";

/**
 * Combined handlers for analyzed article routes
 * Extends the DB interface and adds route-specific helpers
 */
export type AnalyzedArticleHandlers = ArticleAnalyzedDB &
	BaseServerContext & {
		getLocalArticle?: (identifier: string) => Promise<ArticleAnalyzed | null>;
		getFullLocalArticle?: (
			article: ArticleAnalyzed,
			helia: any,
		) => Promise<ArticleAnalyzed>;
		analyzeArticle?: (article: ArticleAnalyzed) => Promise<ArticleAnalyzed>;
	};

/**
 * GET /articles/analyzed/full
 * Retrieves a fully analyzed article by ID, URL, or IPFS CID.
 * Falls back to local article DB if not already analyzed.
 */
export const getFullAnalyzedArticleHandler = async (
	req: Request,
	res: Response,
	handlers: AnalyzedArticleHandlers,
) => {
	const {
		getLocalArticle,
		getFullLocalArticle,
		analyzeArticle,
		helia,
		getAnalyzedArticle,
		saveAnalyzedArticle,
	} = handlers;

	if (!getLocalArticle)
		return handleError(res, "getLocalArticle not provided", 500, "error");
	if (!getFullLocalArticle)
		return handleError(res, "getFullLocalArticle not provided", 500, "error");
	if (!analyzeArticle)
		return handleError(res, "analyzeArticle not provided", 500, "error");
	if (!helia) return handleError(res, "Helia node not provided", 500, "error");
	if (!getAnalyzedArticle || !saveAnalyzedArticle)
		return handleError(res, "Analyzed DB not provided", 500, "error");

	try {
		const lookupKey = req.query.id || req.query.cid || req.query.url;
		if (!lookupKey)
			return handleError(
				res,
				"No article ID, CID, or URL provided",
				400,
				"warn",
			);

		const analyzedArticle = await getAnalyzedArticle(lookupKey as string);
		if (analyzedArticle) {
			log(`Found analyzed article: ${analyzedArticle.id}`);
			return res.json(analyzedArticle);
		}

		const article = await getLocalArticle(lookupKey as string);
		if (!article)
			return handleError(
				res,
				`Article not found for ${lookupKey}`,
				404,
				"warn",
			);

		let fullArticle = await getFullLocalArticle(article, helia);

		if (!fullArticle.analyzed) {
			fullArticle = await analyzeArticle(fullArticle);
		}

		await saveAnalyzedArticle(fullArticle);
		log(`Saved analyzed article: ${fullArticle.id}`);
		res.json(fullArticle);
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
	handlers: AnalyzedArticleHandlers,
) => {
	const { getAllAnalyzedArticles } = handlers;
	if (!getAllAnalyzedArticles)
		return handleError(res, "Analyzed DB not provided", 500, "error");

	try {
		const all = await getAllAnalyzedArticles();
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
	handlers: AnalyzedArticleHandlers,
) => {
	const { saveAnalyzedArticle } = handlers;
	if (!saveAnalyzedArticle)
		return handleError(res, "Analyzed DB not provided", 500, "error");

	try {
		const article: ArticleAnalyzed = req.body;
		if (!article?.id)
			return handleError(res, "No article ID provided", 400, "warn");

		await saveAnalyzedArticle(article);
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
	handlers: AnalyzedArticleHandlers,
) => {
	const { deleteAnalyzedArticle } = handlers;
	if (!deleteAnalyzedArticle)
		return handleError(res, "Analyzed DB not provided", 500, "error");

	try {
		const { id } = req.params;
		if (!id) return handleError(res, "No article ID provided", 400, "warn");

		await deleteAnalyzedArticle(id);
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
export function registerAnalyzedArticleRoutes(app: Express, handlers: any) {
	app.get("/articles/analyzed/full", (req, res) =>
		getFullAnalyzedArticleHandler(req, res, handlers),
	);
	app.get("/articles/analyzed", (req, res) =>
		getAllAnalyzedArticlesHandler(req, res, handlers),
	);
	app.post("/articles/analyzed/save", (req, res) =>
		saveAnalyzedArticleHandler(req, res, handlers),
	);
	app.delete("/articles/analyzed/delete/:id", (req, res) =>
		deleteAnalyzedArticleHandler(req, res, handlers),
	);
}
