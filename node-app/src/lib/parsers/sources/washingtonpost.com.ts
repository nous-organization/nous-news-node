// src/lib/parsers/sources/washingtonpost.com.ts
import { JSDOM } from "jsdom";
import type { ArticleParser } from "@/types/parser";

/**
 * Extracts the main article content from a Washington Post article page HTML.
 *
 * This parser:
 *   - Receives the full HTML of a Washington Post article page.
 *   - Returns the text inside the `<article>` element as a plain string.
 *   - Returns an empty string if no article is found.
 *
 * @param rawHtml - The raw HTML string of a Washington Post article page.
 * @returns The extracted article content as a string.
 */
export const parse: ArticleParser = (rawHtml: string): string => {
	const doc = new JSDOM(rawHtml).window.document;
	return doc.querySelector("article")?.textContent?.trim() ?? "";
};
