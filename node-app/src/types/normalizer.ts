// src/lib/normalizer.ts
import { z } from "zod";
import type { Article, Source } from "@/types";

/**
 * Normalizer function type.
 * Accepts loosely typed parser output and transforms each entry
 * into a fully normalized `Article`.
 */
export type NormalizerFn = (entry: any, source: Source) => Article;

/**
 * ArticleNormalizer type.
 * Accepts an article object (partially parsed or raw) and returns
 * a fully normalized article. Optionally, a hostname or source string can be provided.
 */
export type ArticleNormalizer = (article: any, source?: string) => Article;

/** Valid normalizer types */
export const SourceNormalizers = [
	"json",
	"rss",
	"gdelt",
	"hn",
	"reddit",
] as const;

/** Zod schema for normalizer names */
export const SourceNormalizerSchema = z.enum(SourceNormalizers);

export type SourceNormalizer = z.infer<typeof SourceNormalizerSchema>;

/**
 * Optional runtime validation for normalized Article output.
 * Use this to wrap a normalizer if you want to ensure the return value
 * conforms to the `Article` schema.
 */
export const NormalizerFnReturnSchema = z.object({
	id: z.string(),
	url: z.string().url(),
	title: z.string().min(1),
	content: z.string().optional(),
	summary: z.string().optional(),
	source: z.string().optional(),
	sourceDomain: z.string().optional(),
	sourceType: z.string().optional(),
	categories: z.array(z.string()).optional(),
	tags: z.array(z.string()).optional(),
	language: z.string().optional(),
	author: z.string().optional(),
	publishedAt: z.string().optional(),
	edition: z.string().optional(),
	confidence: z.number().min(0).max(1).optional(),
	analyzed: z.boolean(),
	ipfsHash: z.string().optional(),
	raw: z.any().optional(),
	sourceMeta: z.any().optional(),
});
