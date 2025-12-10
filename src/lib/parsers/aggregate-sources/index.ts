import type { Article, Edition, ParserFn, Source } from "@/types";

import { gdeltParser } from "./gdelt";
import { parseHackerNews } from "./hn";
import { htmlParser } from "./html";
import { jsonParser } from "./json";
import { rssParser } from "./rss";

/**
 * Map of parser name → parser function.
 */
export const parsers: Record<string, ParserFn> = {
	json: jsonParser,
	rss: rssParser,
	gdelt: gdeltParser,
	html: htmlParser,
	hn: parseHackerNews,
};

/**
 * Retrieves parser for a source.
 * Defaults to JSON parser if the source has no parser configured or
 * the configured parser is missing.
 *
 * @param source - Source object
 * @returns Parser function
 */
export function getParser(source: Source): ParserFn {
	const parserName = source.parser ?? "json";
	return parsers[parserName] ?? jsonParser;
}

/**
 * Safely returns a URL string if it is non-empty; otherwise returns undefined.
 *
 * @param u - URL string to validate
 * @returns Valid URL string or undefined
 */
export const safeUrl = (u: string | undefined): string | null => (u && u.trim() !== "" ? u : null);

/**
 * Safely parses a date-like value into an ISO string.
 * If the input is invalid, returns `null` instead of throwing.
 *
 * @param d - Any value that might represent a date (string, number, Date)
 * @returns ISO 8601 string if valid, otherwise `null`
 *
 * @example
 * safeDate("2025-11-26T17:00:00Z") // "2025-11-26T17:00:00.000Z"
 * safeDate("invalid") // null
 * safeDate(undefined) // null
 */
export const safeDate = (d: any): string | null => {
	const date = new Date(d);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

/**
 * Converts a date string in various known formats into ISO 8601 string.
 * Falls back to `safeDate` for standard date parsing.
 *
 * Currently supports:
 * - GDELT-style: "YYYYMMDDTHHMMSSZ"
 * - Standard ISO 8601 strings
 *
 * @param d - Date string to convert
 * @returns ISO 8601 string if valid, otherwise null
 */
export function dateToISO(d: string | undefined): string | null {
	if (!d) return null;

	// GDELT-style: 20251126T160000Z
	const gdeltMatch = d.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
	if (gdeltMatch) {
		const [_, year, month, day, hour, min, sec] = gdeltMatch;
		const iso = `${year}-${month}-${day}T${hour}:${min}:${sec}Z`;
		return safeDate(iso);
	}

	// Fallback to normal date parsing
	return safeDate(d);
}

/**
 * Maps a country name or code to a known edition value.
 * Returns "other" if no match is found.
 *
 * @param country - Country name or ISO code
 * @returns Edition string
 */
export function mapCountryToEdition(country: string | undefined): Edition {
	if (!country) return "other";

	const normalized = country.toLowerCase();
	switch (normalized) {
		case "us":
		case "usa":
		case "united states":
			return "us";
		case "uk":
		case "gb":
		case "united kingdom":
			return "uk";
		case "ca":
		case "canada":
			return "ca";
		case "au":
		case "australia":
			return "au";
		case "eu":
		case "europe":
			return "eu";
		case "de":
		case "germany":
			return "de";
		case "fr":
		case "france":
			return "fr";
		case "es":
		case "spain":
			return "es";
		case "it":
		case "italy":
			return "it";
		case "jp":
		case "japan":
			return "jp";
		case "kr":
		case "south korea":
			return "kr";
		case "cn":
		case "china":
			return "cn";
		case "in":
		case "india":
			return "in";
		case "br":
		case "brazil":
			return "br";
		case "ru":
		case "russia":
			return "ru";
		case "mx":
		case "mexico":
			return "mx";
		case "sa":
		case "saudi arabia":
			return "sa";
		case "ae":
		case "united arab emirates":
			return "ae";
		case "ng":
		case "nigeria":
			return "ng";
		case "za":
		case "south africa":
			return "za";
		default:
			return "other";
	}
}

/**
 * Recursively removes `undefined` values from an object or array.
 * Useful for preparing data for IPLD / OrbitDB storage, which
 * does not allow `undefined`.
 *
 * @param obj - Object or array to clean
 * @returns New object or array with undefined values removed
 */
export function deepCleanArticle(obj: any): any {
	if (Array.isArray(obj)) {
		return obj.map(deepCleanArticle);
	}
	if (obj && typeof obj === "object") {
		return Object.fromEntries(
			Object.entries(obj)
				.filter(([_, v]) => v !== undefined)
				.map(([k, v]) => [k, deepCleanArticle(v)]),
		);
	}
	return obj;
}

/**
 * Cleans an array of articles for database storage.
 * - Recursively removes undefined or null fields (nested too)
 * - Ensures that `url`, `mobileUrl`, and `image` are valid URLs
 * - Returns a new array of `Article` objects safe for OrbitDB storage
 *
 * @param articles - Array of articles to clean
 * @returns Array of cleaned Article objects
 */
export const cleanArticlesForDB = (articles: Article[]): Article[] => {
	return articles.map((article) => {
		// First, recursively remove all undefined/null fields
		const deepCleaned = deepCleanArticle(article);

		const clean: Record<string, any> = {};

		// Validate URL fields after deep cleaning
		Object.entries(deepCleaned).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				if (
					(key === "url" || key === "mobileUrl" || key === "image") &&
					typeof value === "string"
				) {
					try {
						new URL(value); // throws if invalid
						clean[key] = value;
					} catch {
						// skip invalid URL
					}
				} else {
					clean[key] = value;
				}
			}
		});

		// Type-safe cast back to Article
		return clean as Article;
	});
};
