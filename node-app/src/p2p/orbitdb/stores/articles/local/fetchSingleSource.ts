import { translateMultipleTitlesAI } from "@/lib/ai/translate";
import { smartFetch } from "@/lib/fetch";
import { log } from "@/lib/log";
import {
	getNormalizer,
	normalizePublishedAt,
} from "@/lib/normalizers/aggregate-sources";
import { cleanArticlesForDB, getParser } from "@/lib/parsers/aggregate-sources";
import type { Article, Source } from "@/types";
import { ArticleSchema } from "@/types/article";

/**
 * Fetch articles from a single source, normalize, validate, optionally translate titles
 *
 * @param source Source configuration
 * @param targetLanguage Optional BCP-47 language code for translation
 * @param since Optional filter: only include articles newer than this date
 * @param skipTranslation Whether to skip AI title translation (default: true)
 * @returns Object containing the fetched articles and per-source errors
 */
export async function fetchSingleSource(
	source: Source,
	targetLanguage: string,
	since?: Date,
	skipTranslation = true,
): Promise<{
	articles: Article[];
	errors: { endpoint: string; error: string }[];
}> {
	const allArticles: Article[] = [];
	const errors: { endpoint: string; error: string }[] = [];

	if (!source.enabled) {
		log(`Source disabled: ${source.endpoint}`);
		return { articles: [], errors };
	}

	try {
		log(`Fetching articles from source: ${source.endpoint}`);
		const response = await smartFetch(source.endpoint);

		if (!response.ok) {
			const msg = `HTTP error ${response.status} for ${source.endpoint}`;
			log(msg, "warn");
			errors.push({ endpoint: source.endpoint, error: msg });
			return { articles: [], errors };
		}

		const rawData = await response.json();

		const parserFn = getParser(source);
		const normalizerFn = getNormalizer(source);

		const parsed = parserFn(rawData, source);
		if (!Array.isArray(parsed)) {
			const msg = `Parser did not return an array for ${source.endpoint}`;
			log(msg, "warn");
			errors.push({ endpoint: source.endpoint, error: msg });
			return { articles: [], errors };
		}

		const normalized: Article[] = parsed
			.map((a) => {
				const n = normalizerFn(a, source);
				n.publishedAt = normalizePublishedAt(n.publishedAt);
				return n;
			})
			.filter(
				(n) => !since || !n.publishedAt || new Date(n.publishedAt) >= since,
			);

		if (!skipTranslation && targetLanguage && normalized.length > 0) {
			const titles = normalized.map((a) => a.title ?? "");
			try {
				const translatedResults = await translateMultipleTitlesAI(
					titles,
					targetLanguage,
				);

				translatedResults.forEach((result, i) => {
					if (result.status === "success" || result.status === "fallback") {
						normalized[i].title = result.translation ?? result.content;
					} else {
						// error: fallback to original
						normalized[i].title = result.content;
						const msg = `Title translation failed for article ${i} from ${source.endpoint}: ${result.errors?.join(", ") ?? "Unknown error"}`;
						log(msg, "warn");
						errors.push({ endpoint: source.endpoint, error: msg });
					}
				});
			} catch (err) {
				const msg = `Failed to translate titles for ${source.endpoint}: ${(err as Error).message}`;
				log(msg, "warn");
				errors.push({ endpoint: source.endpoint, error: msg });
			}
		}

		const clean = cleanArticlesForDB(normalized);
		for (const a of clean) {
			try {
				ArticleSchema.parse(a);
				allArticles.push(a);
			} catch (err) {
				const msg = `Invalid article structure from ${source.endpoint}: ${(err as Error).message}`;
				log(msg, "warn");
				errors.push({ endpoint: source.endpoint, error: msg });
			}
		}

		log(`Fetched ${clean.length} articles from ${source.endpoint}`);
	} catch (err) {
		const msg = (err as Error).message;
		log(`Error fetching from ${source.endpoint}: ${msg}`, "error");
		errors.push({ endpoint: source.endpoint, error: msg });
	}

	return { articles: allArticles, errors };
}
