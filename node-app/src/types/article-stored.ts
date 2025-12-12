// src/types/article-stored.ts

import { z } from "zod";
import { ArticleSchema } from "./article";
import { ArticleAnalyzedSchema } from "./article-analyzed";

/**
 * @deprecated Using types/article.ts and types/article-analyzed.ts as separate types mostly.
 * A discriminated union representing any article stored in the system.
 *
 * This allows your storage layer (DB, KV, filesystem, etc.) to contain:
 *
 * **1. Raw articles (unprocessed / unanalyzed)**
 *    - Fetched directly from GDELT, RSS, HTML, or custom sources
 *    - Lightweight structure containing metadata, raw text, and optional summaries
 *    - Corresponds to `ArticleSchema`
 *
 * **2. Fully analyzed articles**
 *    - Enriched with bias detection, sentiment, categorization, tags, philosophical notes,
 *      antithesis summaries, timestamps, and optional IPFS references
 *    - Corresponds to `ArticleAnalyzedSchema`
 *
 * The union is **discriminated** using the `analyzed` boolean field:
 * - `analyzed: false` → Raw `ArticleSchema`
 * - `analyzed: true`  → Fully processed `ArticleAnalyzedSchema`
 *
 * This provides:
 * - Safe type narrowing at runtime
 * - Clean branching logic in your data pipeline
 * - Strong guarantees that all stored articles are valid states of your ingestion & analysis flow
 */
export const ArticleStoredSchema = z.discriminatedUnion("analyzed", [
	ArticleAnalyzedSchema, // analyzed: true
	ArticleSchema, // analyzed: false
]);

/**
 * Type alias for any stored article.
 *
 * Resolves to either:
 * - `ArticleAnalyzed` (if `analyzed: true`)
 * - `NormalizedArticle` (if `analyzed: false`)
 */
export type ArticleStored = z.infer<typeof ArticleStoredSchema>;
