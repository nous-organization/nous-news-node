/**
 * @file ipfs.server.ts
 * @description
 * Utility helpers for storing and retrieving content via Helia using modern modules:
 *  - Strings (@helia/strings)
 *  - JSON objects (@helia/json)
 *  - DAG-JSON (@helia/dag-json)
 *  - DAG-CBOR (@helia/dag-cbor)
 */

import { dagCbor } from "@helia/dag-cbor";
// import { dagJson } from "@helia/dag-json";
import { json } from "@helia/json";
import { strings } from "@helia/strings";
import type { Helia } from "helia";
import { CID } from "multiformats/cid";
import type { Article, ArticleAnalyzed } from "@/types";

/**
 * Save the entire Article or ArticleAnalyzed object to IPFS via Helia JSON
 * @param helia Active Helia node
 * @param article Article or ArticleAnalyzed object to persist
 * @returns CID string of stored article
 */
export async function saveArticleToIPFS(
	helia: Helia,
	article: Article | ArticleAnalyzed,
): Promise<string> {
	const j = json(helia);
	const cid = await j.add(article);
	return cid.toString();
}

/**
 * Fetch a full Article or ArticleAnalyzed object from IPFS via CID
 * @param helia Active Helia node
 * @param cidStr CID string pointing to the Article
 * @returns Full Article or ArticleAnalyzed object, or null if not found
 */
export async function fetchArticleFromIPFS(
	helia: Helia,
	cidStr: string,
): Promise<Article | ArticleAnalyzed | null> {
	const j = json(helia);
	const cid = CID.parse(cidStr);
	const article: Article = await j.get(cid);
	return article ?? null;
}

/**
 * Save a UTF‑8 string to Helia via @helia/strings
 *
 * @async
 * @param helia - Active Helia node
 * @param content - UTF-8 string to store
 * @returns CID string or null if content is empty
 *
 * @example
 * const cid = await saveStringToIPFS(helia, "Hello world");
 */
export async function saveStringToIPFS(
	helia: Helia,
	content: string | undefined,
): Promise<string | null> {
	if (!content) return null;
	const s = strings(helia);
	const cid: CID = await s.add(content);
	return cid.toString();
}

/**
 * Load a UTF‑8 string from Helia via @helia/strings
 *
 * @async
 * @param helia - Active Helia node
 * @param cidStr - CID string of the stored content
 * @returns String content or null if CID is missing
 */
export async function fetchStringFromIPFS(
	helia: Helia,
	cidStr: string | null | undefined,
): Promise<string | null> {
	if (!cidStr) return null;
	const s = strings(helia);
	const cid = CID.parse(cidStr);
	return s.get(cid);
}

/**
 * Save a JSON object to Helia via @helia/json
 *
 * @async
 * @param helia - Active Helia node
 * @param obj - Any serializable JS object
 * @returns CID string
 *
 * @example
 * const cid = await saveJSONToIPFS(helia, { hello: "world" });
 */
export async function saveJSONToIPFS(helia: Helia, obj: unknown): Promise<string> {
	const j = json(helia);
	const cid: CID = await j.add(obj);
	return cid.toString();
}

/**
 * Load a JSON object from Helia via @helia/json
 *
 * @async
 * @param helia - Active Helia node
 * @param cidStr - CID string of the stored JSON
 * @returns Parsed object
 */
export async function fetchJSONFromIPFS<T = unknown>(helia: Helia, cidStr: string): Promise<T> {
	const j = json(helia);
	const cid = CID.parse(cidStr);
	return j.get(cid) as Promise<T>;
}

/**
 * Save an object using DAG-CBOR (binary, linkable) via @helia/dag-cbor
 *
 * @async
 * @param helia - Active Helia node
 * @param obj - Any JS object
 * @returns CID string
 */
export async function saveDagCborToIPFS(helia: Helia, obj: unknown): Promise<string> {
	const d = dagCbor(helia);
	const cid: CID = await d.add(obj);
	return cid.toString();
}

/**
 * Load a DAG-CBOR object from Helia
 *
 * @async
 * @param helia - Active Helia node
 * @param cidStr - CID string of stored object
 * @returns Parsed object
 */
export async function fetchDagCborFromIPFS<T = unknown>(helia: Helia, cidStr: string): Promise<T> {
	const d = dagCbor(helia);
	const cid = CID.parse(cidStr);
	return d.get(cid) as Promise<T>;
}
