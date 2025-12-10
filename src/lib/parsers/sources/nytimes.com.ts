// src/lib/parsers/sources/nytimes.com.ts
import { JSDOM } from "jsdom";
import type { ArticleParser } from "@/types/parser";

/**
 * Parses a New York Times article page HTML and extracts the main content as a plain string.
 *
 * The parser:
 *   - Receives the full HTML of a NYTimes article page.
 *   - Finds the main article content inside the `<section name="articleBody">`.
 *   - Concatenates paragraph text into a single string.
 *
 * Limitations:
 *   - Only works on standard NYTimes article pages.
 *   - Dynamic content or paywall overlays may prevent extraction.
 *
 * @param rawHtml - The raw HTML string of a NYTimes article page.
 * @returns The extracted article content as a string.
 */
export const parse: ArticleParser = (rawHtml: string): string => {
	const doc = new JSDOM(rawHtml).window.document;
	const articleSection = doc.querySelector("section[name='articleBody']");

	if (!articleSection) return "";

	// Collect all paragraph texts within the article body
	const paragraphs = Array.from(articleSection.querySelectorAll("p"));
	const content = paragraphs
		.map((p) => p.textContent?.trim() || "")
		.join("\n\n");

	return content;
};
