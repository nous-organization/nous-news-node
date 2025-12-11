// src/lib/articles/saveFullArticleContent.ts

import type { Helia } from "helia";

/**
 * A minimal shape required for article-like objects stored locally.
 */
export interface BaseArticle {
	id: string;
	url: string;
	createdAt: string;
	content?: unknown;
	fullFetchedAt?: string;
	[key: string]: unknown;
}

/**
 * Input options for saveFullArticleContent().
 */
export interface SaveFullArticleOptions<T extends BaseArticle> {
	/** URL used as the lookup key for local articles */
	url: string;

	/** Fetch an article by URL from the local DB */
	getLocalArticle: (url: string) => Promise<T | null>;

	/** Persist an article to the local DB */
	saveLocalArticle: (
		article: T,
		helia: Helia,
		overwrite: boolean,
	) => Promise<void>;

	/** New content to store on the article */
	content: unknown;

	/** Whether existing records should be overwritten */
	overwrite?: boolean;

	/** Helia instance for the underlying storage mechanism */
	helia: Helia;
}

/**
 * Saves article content into local storage, creating or updating the record.
 *
 * Logic:
 * - If the article exists → update its content + `fullFetchedAt`.
 * - If it does not exist → create a new article with `id`, `url`, and timestamps.
 * - Always returns the final stored article object.
 *
 * @template T extends BaseArticle
 * @param options Options object including DB callbacks, URL, content, and Helia context.
 * @returns The updated or newly created article.
 */
export async function saveFullArticleContent<T extends BaseArticle>({
	url,
	getLocalArticle,
	saveLocalArticle,
	content,
	overwrite = false,
	helia,
}: SaveFullArticleOptions<T>): Promise<T> {
	const existing = await getLocalArticle(url);

	const updated: T = {
		...(existing ?? {
			id: crypto.randomUUID(),
			url,
			createdAt: new Date().toISOString(),
		}),
		content,
		fullFetchedAt: new Date().toISOString(),
	} as T;

	await saveLocalArticle(updated, helia, overwrite);

	return updated;
}
