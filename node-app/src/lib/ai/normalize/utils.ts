import { JSDOM } from "jsdom";

function safeString(input?: string) {
	return typeof input === "string" ? input : "";
}

/**
 * Normalize messy HTML content into clean text.
 * - Removes <script>, <style>, <noscript>
 * - Removes hidden elements, ads, navs, headers, footers
 * - Removes common paywall overlays
 * - Collapses multiple spaces and newlines
 * @param html - The raw HTML content
 * @returns Cleaned text
 */
export function cleanHTML(html: string): string {
	if (!html) return "";

	const dom = new JSDOM(html);
	const doc = dom.window.document;

	const removeAll = (nodes: NodeListOf<Element>) => {
		nodes.forEach((el) => {
			el.remove(); // no return
		});
	};

	removeAll(doc.querySelectorAll("script, style, noscript"));
	removeAll(doc.querySelectorAll("header, footer, nav, aside"));
	removeAll(doc.querySelectorAll("[style*='display:none'], [hidden]"));
	removeAll(
		doc.querySelectorAll(
			".paywall, .overlay, .meteredContent, #gateway-content",
		),
	);

	let content = doc.body.textContent?.trim() ?? "";
	content = content.replace(/\s+/g, " ").trim();
	return safeString(content);
}
