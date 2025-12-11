// src/lib/articles/fetchRemoteArticle.ts

import { extractContentFromHtml } from "./extract-content";

/**
 * The unified result shape returned by fetchRemoteArticle().
 */
export interface RemoteArticleResult {
	/** Extracted human-readable article content */
	content: string;

	/** The raw response payload (HTML string or JSON object) */
	raw: unknown;
}

/**
 * Fetches a remote article from a URL, supporting both JSON APIs and HTML pages.
 *
 * Logic:
 * - Performs a network fetch.
 * - If the response is JSON:
 *     - Attempts to read `content` or `body`
 *     - Falls back to stringified JSON
 * - If the response is HTML:
 *     - Extracts readable content using extractContentFromHtml()
 *
 * @param url - The URL of the remote article to fetch.
 * @returns A structured object containing extracted content and raw payload.
 * @throws If the remote server returns a non-OK status.
 */
export async function fetchRemoteArticle(
	url: string,
): Promise<RemoteArticleResult> {
	const response = await fetch(url);

	if (!response.ok) {
		throw new Error(`Failed to fetch remote article (${response.status})`);
	}

	const contentType = response.headers.get("content-type") ?? "";

	// JSON-based API endpoint
	if (contentType.includes("application/json")) {
		const json: Record<string, unknown> = await response.json();

		const content =
			typeof json.content === "string"
				? json.content
				: typeof json.body === "string"
					? json.body
					: JSON.stringify(json);

		return {
			content,
			raw: json,
		};
	}

	// HTML-based page
	const html = await response.text();

	return {
		content: extractContentFromHtml(html),
		raw: html,
	};
}
