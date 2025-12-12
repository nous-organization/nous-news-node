// src/lib/articles/translate.ts

import { translateMultipleTitlesAI } from "@/lib/ai/translate";

export type TranslatableRecord = Record<string, unknown>;

/**
 * Translates specified text fields on an article-like object using the AI translator.
 *
 * This helper:
 * - Skips missing or non-string fields
 * - Catches translation errors but continues processing
 *
 * @template T extends TranslatableRecord
 * @param article The article object whose fields will be translated.
 * @param keys List of keys on the article to translate.
 * @param lang Target language code (e.g., "en", "ko").
 * @returns The same article object with translated fields applied.
 */
export async function translateArticleFields<T extends TranslatableRecord>(
	article: T,
	keys: (keyof T)[],
	lang: string,
): Promise<T> {
	for (const key of keys) {
		const value = article[key];

		// Skip non-string or empty string fields
		if (typeof value !== "string" || !value.trim()) continue;

		try {
			const [translated] = await translateMultipleTitlesAI([value], lang);

			if (typeof translated === "string") {
				// Safe assignment because we validated it's a string
				(article[key] as unknown as string) = translated;
			}
		} catch (err) {
			console.warn(
				`[translateArticleFields] Failed to translate field "${String(key)}":`,
				err,
			);
			// Continue translation of the remaining keys
		}
	}

	return article;
}
