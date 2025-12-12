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
 * Fetch articles from multiple sources, normalize, validate, optionally translate titles
 *
 * @param sources Array of enabled sources
 * @param targetLanguage Optional language code (for translation)
 * @param since Optional filter: only fetch articles newer than this date
 * @param skipTranslation Whether to skip AI translation (default: true)
 * @returns Object with fetched articles and per-source errors
 */
export async function fetchAllLocalSources(
	sources: Source[],
	targetLanguage: string,
	since?: Date,
	skipTranslation = true,
): Promise<{
	articles: Article[];
	errors: { endpoint: string; error: string }[];
}> {
	const enabledSources = sources.filter((s) => s.enabled);
	const allArticles: Article[] = [];
	const errors: { endpoint: string; error: string }[] = [];

	for (const source of enabledSources) {
		try {
			log(`Fetching articles from source: ${source.endpoint}`);
			const response = await smartFetch(source.endpoint);

			if (!response.ok) {
				const msg = `HTTP error ${response.status} for ${source.endpoint}`;
				log(msg, "warn");
				errors.push({ endpoint: source.endpoint, error: msg });
				continue;
			}

			const rawData = await response.json();

			const parserFn = getParser(source);
			const normalizerFn = getNormalizer(source);

			const parsed = parserFn(rawData, source);
			if (!Array.isArray(parsed)) {
				const msg = `Parser did not return an array for ${source.endpoint}`;
				log(msg, "warn");
				errors.push({ endpoint: source.endpoint, error: msg });
				continue;
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
					const translated = await translateMultipleTitlesAI(
						titles,
						targetLanguage,
					);
					translated.forEach((t, i) => {
						normalized[i].title = t;
					});
				} catch (err) {
					log(
						`Failed to translate titles for ${source.endpoint}: ${(err as Error).message}`,
						"warn",
					);
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
	}

	log(`Total articles fetched: ${allArticles.length}`);
	return { articles: allArticles, errors };
}
