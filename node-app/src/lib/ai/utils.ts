import { JSDOM } from "jsdom";
const PYTHON_BACKEND_URL =
	process.env.PYTHON_BACKEND_URL || "http://localhost:8000";

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


/**
 * Helper to call Python AI service.
 */
export async function callPythonAI(endpoint: string, payload: Record<string, any>) {
	try {
		const res = await fetch(`${PYTHON_BACKEND_URL}${endpoint}`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!res.ok) {
			throw new Error(`Python AI returned ${res.status}: ${res.statusText}`);
		}

		return await res.json();
	} catch (err: any) {
		console.warn(`Python AI call failed: ${err.message}`);
		return { status: "error", data: null, errors: [err.message] };
	}
}