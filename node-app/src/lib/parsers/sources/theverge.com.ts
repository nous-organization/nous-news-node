// src/lib/parsers/sources/theverge.com.ts
import { JSDOM } from "jsdom";
import type { ArticleParser } from "@/types/parser";

/**
 * Parses a The Verge article page HTML and extracts the main content as a plain string.
 *
 * The parser:
 *   - Receives the full HTML of a The Verge article page.
 *   - Finds the main article content by selecting paragraphs and headings.
 *   - Concatenates them into a single string.
 *   - Returns the cleaned article content.
 *
 * Limitations:
 *   - Only works on standard The Verge article pages.
 *   - Dynamic content loaded via JS may not be captured.
 *
 * @param rawHtml - The raw HTML string of a The Verge article page.
 * @returns The extracted article content as a string.
 */
export const parse: ArticleParser = (rawHtml: string): string => {
	const dom = new JSDOM(rawHtml);
	const document = dom.window.document;

	// The Verge articles usually have <div class="c-entry-content"> containing paragraphs
	const articleContainer = document.querySelector("div.c-entry-content");

	if (!articleContainer) {
		// fallback: try article tag
		const articleTag = document.querySelector("article");
		if (!articleTag) return ""; // nothing found
		const fallbackNodes = Array.from(articleTag.querySelectorAll("p, h2, h3"));
		return fallbackNodes
			.map((node) => node.textContent?.trim() || "")
			.join("\n\n");
	}

	// Collect all paragraphs and headings inside the main content container
	const contentNodes = Array.from(
		articleContainer.querySelectorAll("p, h2, h3"),
	);

	const content = contentNodes
		.map((node) => node.textContent?.trim() || "")
		.join("\n\n");

	return content;
};
