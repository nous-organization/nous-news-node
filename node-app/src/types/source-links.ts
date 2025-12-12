// src/types/source-links.ts

import { z } from "zod";
import { PoliticalBiasValues } from "./article";
import { SourceCategories } from "./source";

export const SourceArticleLinkSchema = z.object({
	/** Canonical URL of the article */
	url: z.string().url(),

	/** Human-readable title */
	title: z.string().optional(),

	/** When the article was published */
	publishedAt: z.string().datetime().optional(),

	/** The source name (must match Source.name) */
	source: z.string(),

	/** Optional political bias inherited or inferred */
	bias: z.enum(PoliticalBiasValues).optional(),

	/** Optional category ("news", "tech", etc.) */
	category: z.enum(SourceCategories).optional(),
});

export type SourceArticleLink = z.infer<typeof SourceArticleLinkSchema>;
