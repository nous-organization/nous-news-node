/**
 * @file ai/sources/adfontes.server.ts
 * @description
 * Fetch + normalize ratings from Ad Fontes Media using the **official CSV dataset**.
 *
 * Instructions for users:
 * 1. Register at Ad Fontes to access the latest CSV dataset:
 *    https://adfontesmedia.com/advertisers/
 * 2. Download the CSV file (usually named like `Media Bias Chart - vX.csv`).
 * 3. Save it in your project, e.g., `/data/adfontes.csv`.
 * 4. Set the `ADFONTES_CSV_PATH` environment variable to the file path.
 *
 * Notes:
 * - If the CSV file is missing or invalid, the function will return `{}`.
 */

import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";
import type { SourceMetaPartial } from "@/types";
import { normalizeBias } from "./helpers";

// Environment variable for the CSV file path
const ADFONTES_CSV_PATH =
	process.env.ADFONTES_CSV_PATH || path.resolve("data/adfontes.csv");

interface AdFontesRow {
	Source: string;
	Bias: string;
	Reliability: string | number;
}

const cache: Record<string, { bias: string; reliability: number }> = {};

/**
 * Load and parse the Ad Fontes CSV dataset into memory.
 */
async function loadDataset(): Promise<
	Record<string, { bias: string; reliability: number }>
> {
	if (Object.keys(cache).length > 0) return cache;

	if (!fs.existsSync(ADFONTES_CSV_PATH)) {
		console.warn(
			`Ad Fontes CSV not found at ${ADFONTES_CSV_PATH}. Returning empty results.`,
		);
		return {};
	}

	const csvText = fs.readFileSync(ADFONTES_CSV_PATH, "utf-8");

	const parsed = Papa.parse<AdFontesRow>(csvText, {
		header: true,
		skipEmptyLines: true,
	});

	if (parsed.errors.length) {
		console.error("AdFontes CSV parse errors:", parsed.errors);
		return {};
	}

	for (const row of parsed.data) {
		if (!row.Source || !row.Bias || !row.Reliability) continue;

		cache[row.Source.trim()] = {
			bias: row.Bias.trim(),
			reliability: Number(row.Reliability),
		};
	}

	return cache;
}

/**
 * Fetch Ad Fontes metadata for a single source.
 * Returns normalized bias and reliability.
 *
 * @param name Name of the source
 * @returns Partial source metadata (`SourceMetaPartial`)
 *
 * @example
 * fetchAdFontes("CNN Digital")
 *   → { adFontes: "lean-left", adFontesReliability: 0.9 }
 */
export async function fetchAdFontes(name: string): Promise<SourceMetaPartial> {
	const dataset = await loadDataset();

	const row = dataset[name];
	if (!row) return {};

	return {
		adFontes: normalizeBias(row.bias),
		adFontesReliability: row.reliability,
	};
}
