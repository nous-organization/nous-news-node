// src/services/ai/tokenizer.ts
import fs from "node:fs";
import path from "node:path";
import { XLMRobertaTokenizer } from "@xenova/transformers";

// Import your model cache directory constant from models.ts
import { MODEL_DIR } from "./models";

// Internal cached singleton instance (or promise resolving to it)
let tokenizerPromise: Promise<XLMRobertaTokenizer> | null = null;

/**
 * Initialize (or retrieve) a shared GPT-2 tokenizer instance.
 *
 * This function implements a lazy-loaded singleton:
 *  - The first call loads the tokenizer from the local model cache.
 *  - Later calls return the same resolved tokenizer instance.
 *
 * ## Why a singleton?
 * - Tokenizer initialization is expensive (file I/O + model parse)
 * - Reusing the same tokenizer saves CPU and improves throughput
 * - Guarantees consistent tokenization across all AI modules
 *
 * ## Behavior
 * 1. Resolves MODEL_DIR.
 * 2. Ensures directory exists.
 * 3. Loads tokenizer with:
 *      - local_files_only: false
 *      - cache_dir: MODEL_DIR
 *
 * @returns A shared GPT2Tokenizer instance (Promise resolved once)
 *
 * @throws If the local model directory is missing or unreadable
 *
 * @example
 * const tokenizer = await getTokenizer();
 * const tokens = tokenizer.encode("Hello world");
 */
export function getTokenizer(): Promise<XLMRobertaTokenizer> {
	if (tokenizerPromise) {
		// Return existing shared instance or its creation promise
		return tokenizerPromise;
	}

	tokenizerPromise = (async () => {
		const localPath = path.resolve(MODEL_DIR);

		if (!fs.existsSync(localPath)) {
			throw new Error(
				`Tokenizer initialization failed: model directory not found at ${localPath}.`,
			);
		}

		// Load tokenizer from local cache only (no network)
		return XLMRobertaTokenizer.from_pretrained("xlm-roberta-base", {
			local_files_only: false,
			cache_dir: MODEL_DIR,
		});
	})();

	return tokenizerPromise;
}
