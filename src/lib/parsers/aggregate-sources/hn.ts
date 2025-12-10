import type { ParserFn } from "@/types";

/**
 * Hacker News parser.
 * Converts the array of item JSON returned by our backend fetcher.
 *
 * NOTE:
 * The backend must fetch:
 * - /v0/topstories.json → [ids]
 * - /v0/item/{id}.json  → real item JSON
 */
export const parseHackerNews: ParserFn = (raw: any): any[] => {
	if (!raw || !Array.isArray(raw)) return [];
	return raw; // raw should be item JSON objects
};
