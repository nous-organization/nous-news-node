// frontend/server/src/lib/fetch.server.ts

/**
 * A rotating list of realistic browser User-Agent strings used to prevent
 * servers from rejecting Node.js default requests or fingerprinting
 * multiple P2P peers as identical clients.
 *
 * These User-Agents are intentionally varied across:
 *  - Operating systems (macOS, Windows, Linux, iOS, Android)
 *  - Browser engines (Chrome, WebKit/Safari, Firefox)
 *  - Desktop vs mobile
 *
 * A lightweight app-specific identifier is included as a fallback.
 */
const USER_AGENTS: readonly string[] = [
	// Chrome (macOS)
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",

	// Chrome (Windows)
	"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",

	// Firefox (macOS)
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 14.3; rv:120.0) Gecko/20100101 Firefox/120.0",

	// Firefox (Linux)
	"Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:119.0) Gecko/20100101 Firefox/119.0",

	// Safari (iPhone, iOS 17)
	"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",

	// Chrome (Android 14)
	"Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",

	// Minimal fallback identifier
	"NousClient/1.0 (P2P; OrbitDB; Helia)",
];

/**
 * Selects a random User-Agent string from the predefined list.
 *
 * @returns {string} A User-Agent string chosen uniformly at random.
 */
function getRandomUserAgent(): string {
	const index = Math.floor(Math.random() * USER_AGENTS.length);
	return USER_AGENTS[index];
}

export interface SmartFetchOptions extends RequestInit {
	/** Additional headers to merge with generated defaults. */
	headers?: Record<string, string>;
}

/**
 * A wrapper around the built-in `fetch()` API that:
 *
 *  - Injects a randomized, realistic User-Agent header
 *  - Ensures `Accept: application/json` unless overridden
 *  - Enforces a default timeout (10 seconds)
 *  - Throws on non-2xx HTTP responses
 *  - Logs and rethrows errors for upstream handling
 *
 * @param {string} url
 *   The absolute URL to request.
 *
 * @param {SmartFetchOptions} [opts={}]
 *   Optional fetch configuration. Any provided headers override defaults.
 *
 * @returns {Promise<Response>}
 *   The raw Fetch API `Response` object. Callers may use `.json()`, `.text()`, etc.
 *
 * @throws {Error}
 *   If the request fails due to network issues, timeout, or receives a non-ok status code.
 */
export async function smartFetch(url: string, opts: SmartFetchOptions = {}): Promise<Response> {
	const headers: Record<string, string> = {
		"User-Agent": getRandomUserAgent(),
		Accept: "application/json",
		...opts.headers,
	};

	try {
		const res = await fetch(url, {
			...opts,
			headers,
			signal: opts.signal ?? AbortSignal.timeout(10_000),
		});

		if (!res.ok) {
			throw new Error(`HTTP ${res.status}`);
		}

		return res;
	} catch (err: any) {
		console.error(`smartFetch error for ${url}:`, err?.message ?? err);
		throw err;
	}
}
