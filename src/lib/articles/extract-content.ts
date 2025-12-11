// src/lib/articles/extractContentFromHtml.ts

/**
 * Extracts meaningful article content from an HTML document using lightweight
 * regular-expression heuristics. Designed as a temporary placeholder until a
 * real HTML parser (e.g., Cheerio, JSDOM) is introduced.
 *
 * Extraction rules (in order):
 * 1. Extract the first <article>...</article> block if present.
 * 2. Otherwise, extract the <body>...</body> block.
 * 3. As a final fallback, return the entire HTML input.
 *
 * Notes:
 * - Regex-based HTML parsing is not fully reliable, but this implementation
 *   works sufficiently well for simple extraction pipelines or early prototypes.
 * - The function is intentionally simple and side-effect free.
 *
 * @param html - The raw HTML string to extract content from.
 * @returns A best-effort extracted content string.
 */
export function extractContentFromHtml(html: string): string {
	if (typeof html !== "string" || html.length === 0) {
		return "";
	}

	// Try to match an <article> tag with any content inside.
	const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
	if (articleMatch) {
		return articleMatch[0];
	}

	// Fallback: extract the <body>...</body> block
	const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i);
	if (bodyMatch) {
		return bodyMatch[0];
	}

	// Final fallback: return the full HTML
	return html;
}
