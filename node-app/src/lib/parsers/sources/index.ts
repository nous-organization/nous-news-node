// src/lib/parsers/sources/index.ts
import type { ArticleParser } from "@/types/parser";
import * as bbc from "./bbc.com";
import * as generic from "./generic";
import * as nytimes from "./nytimes.com";
import * as theverge from "./theverge.com";
import * as washingtonpost from "./washingtonpost.com";

/**
 * Registry mapping hostnames to their respective HTML parsers.
 * Each parser must implement the ArticleParser signature: (rawHtml: string) => string
 *
 * If a hostname is not listed here, the generic parser can be used as a fallback.
 */
export const parserRegistry: Record<string, ArticleParser> = {
	// NYTimes
	"nytimes.com": nytimes.parse,
	"www.nytimes.com": nytimes.parse, // optional alias

	// The Verge
	"theverge.com": theverge.parse,
	"www.theverge.com": theverge.parse,

	// BBC
	"bbc.com": bbc.parse,
	"www.bbc.com": bbc.parse,

	// Washington Post
	"washingtonpost.com": washingtonpost.parse,
	"www.washingtonpost.com": washingtonpost.parse,
};

/**
 * Retrieve the ArticleParser for a given URL.
 *
 * @param url - The full URL of the article page.
 * @returns The parser function for the site, or the generic parser if no specific parser is registered.
 */
export function getParserForUrl(url: string): ArticleParser {
	try {
		const hostname = new URL(url).hostname;
		// Return registered parser, or fallback to generic
		return parserRegistry[hostname] ?? generic.parse;
	} catch (err) {
		// On invalid URL, fallback to generic parser
		return generic.parse;
	}
}
