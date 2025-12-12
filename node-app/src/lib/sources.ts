// src/lib/sources.ts
import fs from "node:fs/promises";
import path from "node:path";
import { translateMultipleTitlesAI } from "@/lib/ai/translate";
import { smartFetch } from "@/lib/fetch";
import { broadcast, log } from "@/lib/log";
import { getNormalizer } from "@/lib/normalizers/aggregate-sources";
import { cleanArticlesForDB, getParser } from "@/lib/parsers/aggregate-sources";
import type { Article, Source } from "@/types";

const DATA_PATH = path.join(process.cwd(), "data");
const SOURCES_FILE = path.join(DATA_PATH, "sources.json");

/**
 * Load saved sources from disk, if exists
 */
export async function loadSources(): Promise<Source[] | null> {
	try {
		await fs.mkdir(DATA_PATH, { recursive: true });
		const file = await fs.readFile(SOURCES_FILE, "utf-8");
		return JSON.parse(file) as Source[];
	} catch (err: any) {
		if (err.code === "ENOENT") return null;
		console.error("Failed to load sources.json:", err);
		return null;
	}
}

/**
 * Persist sources.json to disk
 */
export async function saveSources(sources: Source[]) {
	await fs.mkdir(DATA_PATH, { recursive: true });
	await fs.writeFile(SOURCES_FILE, JSON.stringify(sources, null, 2), "utf-8");
}

/**
 * Fetch raw JSON data from a source endpoint
 */
export async function fetchRawSourceData(source: Source) {
	const response = await smartFetch(source.endpoint);
	if (!response.ok) {
		throw new Error(`HTTP ${response.status} fetching ${source.endpoint}`);
	}
	return response.json();
}

/**
 * Parse, normalize, optionally translate articles
 */
export async function parseNormalizeTranslate(
	rawData: any,
	source: Source,
	language?: string,
	skipTranslation = true,
) {
	const parserFn = getParser(source);
	const normalizerFn = getNormalizer(source);

	const parsed = parserFn(rawData, source);
	if (!Array.isArray(parsed)) {
		throw new Error(`Parser for ${source.name} did not return an array`);
	}

	const normalized = parsed.map((a) => {
		const n = normalizerFn(a, source);
		return n;
	});

	// Broadcast progress
	normalized.forEach((article, index) => {
		broadcast({
			type: "source:fetch:progress",
			payload: {
				source: source.name,
				index,
				total: normalized.length,
				articleId: article.id,
			},
		});
	});

	// Translation
	if (!skipTranslation && language && normalized.length > 0) {
		const titles = normalized.map((a) => a.title ?? "");
		try {
			const translated = await translateMultipleTitlesAI(titles, language);
			translated.forEach((t, i) => {
				normalized[i].title = t;
			});
		} catch (err) {
			log(
				`Translation failed for ${source.name}: ${(err as Error).message}`,
				"warn",
			);
		}
	}

	return cleanArticlesForDB(normalized);
}

/**
 * Full pipeline: fetch, parse, normalize, translate for one source
 */
export async function fetchArticlesForSource(
	source: Source,
	language = "en",
	skipTranslation = true,
): Promise<Article[]> {
	try {
		broadcast({
			type: "source:fetch:start",
			payload: { source: source.name },
		});

		const rawData = await fetchRawSourceData(source);
		const articles = await parseNormalizeTranslate(
			rawData,
			source,
			language,
			skipTranslation,
		);

		broadcast({
			type: "source:fetch:done",
			payload: { source: source.name, count: articles.length },
		});

		return articles;
	} catch (err: any) {
		broadcast({
			type: "source:fetch:error",
			payload: { source: source.name, message: err.message },
		});
		throw err;
	}
}

/**
 * Merge default sources with persisted sources
 */
export async function getMergedSources(
	defaultSources: Source[],
): Promise<Source[]> {
	const persisted = (await loadSources()) ?? [];
	const merged = defaultSources.map((d) => {
		const p = persisted.find((s) => s.name === d.name);
		return p ? { ...d, ...p } : d;
	});
	const extras = persisted.filter(
		(s) => !defaultSources.some((d) => d.name === s.name),
	);
	return [...merged, ...extras];
}
