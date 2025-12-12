import { z } from "zod";
import { type Article, ArticleSchema, type Source } from "@/types";

/**
 * Supported parser types for different sources.
 * - `"json"`: Source returns JSON payload
 * - `"rss"`: Source is an RSS feed
 * - `"gdelt"`: GDELT-style structured data
 * - `"html"`: HTML content requiring parsing
 * - `"hn"`: Hacker News
 * - `"reddit"`: Reddit API / posts
 */
export const SourceParsers = ["json", "rss", "gdelt", "html", "hn", "reddit"] as const;
export const SourceParserSchema = z.enum(SourceParsers);
export type SourceParser = z.infer<typeof SourceParserSchema>;

/**
 * TypeScript function signature for a generic parser function.
 *
 * A ParserFn:
 * - receives `rawData` (any raw data from the source)
 * - receives the full `Source` definition
 * - returns an array of normalized `Article` objects
 */
export type ParserFn = (rawData: any, source: Source) => Article[];

/**
 * Optional runtime Zod schema for validating parser output.
 * Use this to ensure your parser actually returns valid `Article` objects.
 */
export const ParserFnReturnSchema = z.array(ArticleSchema);

/**
 * Parser type for HTML content specifically.
 *
 * A HTML `ArticleParser`:
 * - receives raw HTML string
 * - returns a cleaned string of article content
 */
export type ArticleParser = (rawHtml: string) => string;

/**
 * Optional runtime Zod schema for validating ArticleParser output.
 * You could wrap a parser like:
 * ```ts
 * const cleaned = ArticleParserSchema.parse(myParser(html));
 * ```
 */
export const ArticleParserSchema = z.string();
