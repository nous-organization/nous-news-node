/**
 * @file sourceMeta.server.ts
 * @description Unified library to fetch or map media bias ratings from major sources.
 * Uses live sources: MBFC, AllSides, AdFontes, plus static fallback.
 */

import { DEFAULT_SOURCES } from "@/constants/sources";
import { fetchAdFontes } from "@/lib/ai/sources/adfontes.server";
import { fetchAllSides } from "@/lib/ai/sources/allsides.server";
import { computeUnifiedBias } from "@/lib/ai/sources/helpers";
import { fetchMBFC } from "@/lib/ai/sources/mbfc.server";
import type { Factuality, PoliticalBias, SourceMetaFull } from "@/types";

/**
 * Fetches and aggregates bias metadata for a given news source.
 * Combines live sources (MBFC, AllSides, AdFontes) with static fallback.
 *
 * Returns a `SourceMetaFull` object including:
 * - individual bias ratings
 * - reliability/factuality
 * - unified majority-vote bias
 * - last updated timestamp
 *
 * @param sourceName - The canonical name of the news source (e.g., "CNN")
 * @returns {Promise<SourceMetaFull>} Normalized source metadata with unified bias
 *
 * @example
 * const bias = await getSourceMeta("CNN");
 * console.log(bias.unifiedBias); // "lean-left"
 * console.log(bias.mbfcFactuality); // "high"
 */
export async function getSourceMeta(sourceName: string): Promise<SourceMetaFull> {
	if (!sourceName) {
		return {
			name: "",
			unifiedBias: "unknown",
			factuality: "unknown",
			lastUpdated: new Date().toISOString(),
		};
	}

	// Static fallback from DEFAULT_SOURCES
	const staticFallback = DEFAULT_SOURCES.find((s) => s.name === sourceName);

	try {
		// Fetch live sources in parallel
		const [mbfcData, allSidesData, adFontesData] = await Promise.all([
			fetchMBFC(sourceName),
			fetchAllSides(sourceName),
			fetchAdFontes(sourceName),
		]);

		// Apply static fallback if live data is missing
		const adf: PoliticalBias = adFontesData.adFontes ?? staticFallback?.bias ?? "unknown";
		const alls: PoliticalBias = allSidesData.allSides ?? staticFallback?.bias ?? "unknown";
		const mbfc: PoliticalBias = mbfcData.mbfc ?? staticFallback?.bias ?? "unknown";

		// Compute unified bias (majority vote)
		const unifiedBias: PoliticalBias = computeUnifiedBias(adf, alls, mbfc);

		// Build full metadata
		return {
			name: sourceName,
			adFontes: adf,
			adFontesReliability: adFontesData.adFontesReliability,
			allSides: alls,
			mbfc: mbfc,
			mbfcFactuality: mbfcData.mbfcFactuality ?? ("unknown" as Factuality),
			unifiedBias,
			factuality: mbfcData.mbfcFactuality ?? ("unknown" as Factuality),
			lastUpdated: new Date().toISOString(),
		};
	} catch (err) {
		console.error(`Error fetching bias metadata for ${sourceName}:`, err);

		// Return static fallback if live fetch fails
		const fallbackBias: PoliticalBias = staticFallback?.bias ?? "unknown";

		return {
			name: sourceName,
			adFontes: fallbackBias,
			allSides: fallbackBias,
			mbfc: fallbackBias,
			unifiedBias: fallbackBias,
			factuality: "unknown",
			lastUpdated: new Date().toISOString(),
		};
	}
}
