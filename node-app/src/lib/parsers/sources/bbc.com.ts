// src/lib/parsers/sources/bbc.com.ts
import { JSDOM } from "jsdom";
import type { ArticleParser } from "@/types/parser";

/**
 * Parses a BBC article page HTML and extracts the main content as a plain string.
 *
 * The parser:
 *   - Receives the full HTML of a BBC article page.
 *   - Finds the main content sections (headings + paragraphs).
 *   - Concatenates them into a single string.
 *   - Returns the cleaned article content.
 *
 * Limitations:
 *   - Only works on standard BBC article pages.
 *   - Dynamic content loaded via JS may not be captured.
 *
 * @param rawHtml - The raw HTML string of a BBC article page.
 * @returns The extracted article content as a string.
 */
export const parse: ArticleParser = (rawHtml: string): string => {
	const dom = new JSDOM(rawHtml);
	const document = dom.window.document;

	// Attempt to select main article paragraphs and headings
	const articleNodes = Array.from(
		document.querySelectorAll("article p, article h2, article h3"),
	);

	// Fallback selector if <article> structure isn't present
	if (articleNodes.length === 0) {
		const fallbackNodes = Array.from(
			document.querySelectorAll("div[data-component='text-block']"),
		);
		if (fallbackNodes.length > 0) {
			return fallbackNodes
				.map((node) => node.textContent?.trim() || "")
				.join("\n\n");
		}
		return ""; // nothing found
	}

	// Combine all text content
	const content = articleNodes
		.map((node) => node.textContent?.trim() || "")
		.join("\n\n");

	return content;
};
