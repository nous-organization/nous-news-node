// src/lib/parsers/sources/generic.ts
import { JSDOM } from "jsdom";
import { cleanHTML } from "@/lib/ai/utils";
import type { ArticleParser } from "@/types/parser";

/**
 * Generic article parser for any site.
 *
 * This parser attempts to extract the main article content by:
 * 1. Cleaning HTML (removing scripts, styles, hidden elements, ads, paywalls, etc.)
 * 2. Trying to select main content sections like <article>, <main>, or common blog/news containers
 * 3. Falling back to the <body> text if nothing else is found
 *
 * @param rawHtml - The raw HTML of any article page
 * @returns Extracted article content as a plain string
 */
export const parse: ArticleParser = (rawHtml: string): string => {
	// First, clean the HTML
	const cleanedHtml = cleanHTML(rawHtml);
	const doc = new JSDOM(cleanedHtml).window.document;

	// Try to select main article content
	const selectors = [
		"article",
		"main",
		".post-content",
		".entry-content",
		".article-body",
		".story-body",
		"[itemprop='articleBody']",
	];

	for (const sel of selectors) {
		const node = doc.querySelector(sel);
		if (node?.textContent?.trim()) {
			return node.textContent.trim();
		}
	}

	// Fallback to full cleaned body text
	return doc.body.textContent?.trim() ?? "";
};
