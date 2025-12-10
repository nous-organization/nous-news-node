// frontend/src/lib/parsers/html.ts
import type { Article, ParserFn, Source } from "@/types";

/**
 * HTML parser (unimplemented).
 *
 * Stub for future HTML scraping using DOMParser / Cheerio / JSDom.
 */
export const htmlParser: ParserFn = (raw: any, source: Source): Article[] => {
	console.warn(`HTML parser is not implemented for source: ${source.name}`);
	return [];
};
