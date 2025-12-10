// frontend/src/types/article-federated.ts
import { z } from "zod";
import { ArticleSchema } from "./article";

export const feedTypes = ["local", "analyzed", "federated", "archived"];

/**
 * Pointer to an article stored in the federation (or distributed network).
 *
 * This object contains minimal metadata for federated peers.
 * The full article can be retrieved from IPFS using the CID.
 */
export const ArticleFederatedSchema = ArticleSchema.extend({
	/** CID (Content Identifier) for the full article stored in IPFS */
	cid: z.string(),

	/** ISO timestamp when this article pointer was created or last updated */
	timestamp: z.string(),

	/** Optional content hash for verification or deduplication */
	hash: z.string().optional(),

	/** True if this article has been analyzed for bias, sentiment, etc. */
	analyzed: z.boolean(),

	/** Optional source or publisher name (e.g., "bbc.com") */
	source: z.string().optional(),

	/** Optional edition or regional context (e.g., "us", "kr", "international") */
	edition: z.string().optional(),
});

export type ArticleFederated = z.infer<typeof ArticleFederatedSchema>;

/**
 * FeedType describes the type of article storage or workflow.
 *
 * - `local`: The article exists only on the local node, not yet shared.
 * - `analyzed`: The article has been analyzed locally with AI features.
 * - `federated`: The article pointer has been shared or received via the federation.
 * - `archived`: Historical or immutable articles, used for long-term storage or audits.
 */
export const FeedTypeSchema = z.enum(feedTypes);
export type FeedType = z.infer<typeof FeedTypeSchema>;
